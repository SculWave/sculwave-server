'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const MAX_DESCRIPTION_LENGTH = 500

type PlatformSupport =
  | 'JAVA_ONLY'
  | 'BEDROCK_ONLY'
  | 'JAVA_AND_BEDROCK'

export default function NetworkDiscoveryForm({
  networkId,
  name,
  description,
  publicListed,
  imageUrl,
  platformSupport,
  javaAddress,
  bedrockAddress,
  gameVersion,
  region,
  logoUrl,
}: {
  networkId: string
  name: string
  description: string | null
  publicListed: boolean
  imageUrl: string | null
  logoUrl: string | null
  platformSupport: PlatformSupport
  javaAddress: string | null
  bedrockAddress: string | null
  gameVersion: string | null
  region: string | null

}) {
  const [descriptionValue, setDescriptionValue] = useState(
    description ?? '',
  )
  const [publicListedValue, setPublicListedValue] =
    useState(publicListed)

  const [platformSupportValue, setPlatformSupportValue] =
    useState<PlatformSupport>(platformSupport)

  const [javaAddressValue, setJavaAddressValue] = useState(
    javaAddress ?? '',
  )

  const [bedrockAddressValue, setBedrockAddressValue] = useState(
    bedrockAddress ?? '',
  )

  const [gameVersionValue, setGameVersionValue] = useState(
    gameVersion ?? '',
  )

  const [regionValue, setRegionValue] = useState(region ?? '')



  const [loading, setLoading] = useState(false)

  const [uploading, setUploading] = useState<'banner' | 'logo' | null>(null)

  const [dragging, setDragging] = useState<'banner' | 'logo' | null>(null)

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024

  const ACCEPTED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
  ]

  const trimmedDescription = descriptionValue.trim()
  const trimmedJavaAddress = javaAddressValue.trim()
  const trimmedBedrockAddress = bedrockAddressValue.trim()
  const trimmedGameVersion = gameVersionValue.trim()
  const trimmedRegion = regionValue.trim()

  const unchanged =
    trimmedDescription === (description ?? '').trim() &&
    publicListedValue === publicListed &&
    platformSupportValue === platformSupport &&
    trimmedJavaAddress === (javaAddress ?? '').trim() &&
    trimmedBedrockAddress === (bedrockAddress ?? '').trim() &&
    trimmedGameVersion === (gameVersion ?? '').trim() &&
    trimmedRegion === (region ?? '').trim()

  async function save() {
    if (loading || unchanged) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/dashboard/networks/${networkId}/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description: trimmedDescription || null,
            imageUrl,
            publicListed: publicListedValue,

            platformSupport: platformSupportValue,

            javaAddress: trimmedJavaAddress || null,
            bedrockAddress: trimmedBedrockAddress || null,

            gameVersion: trimmedGameVersion || null,
            region: trimmedRegion || null,

          }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        if (data?.error === 'NETWORK_NAME_TAKEN') {
          toast.error('That network name is already in use.')
        } else {
          toast.error(
            'Unable to update network discovery settings.',
          )
        }

        return
      }

      toast.success('Network discovery settings saved.')
      location.reload()
    } catch {
      toast.error('Unable to update network discovery settings.')
    } finally {
      setLoading(false)
    }
  }

  async function uploadImage(
    type: 'banner' | 'logo',
    file: File,
  ) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only PNG, JPEG, WebP, and GIF images are allowed.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be 10 MB or smaller.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(type)

    try {
      const response = await fetch(
        `/api/dashboard/networks/${networkId}/${type}`,
        {
          method: 'POST',
          body: formData,
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Upload failed.')
        return
      }

      toast.success(
        type === 'banner'
          ? 'Network banner updated.'
          : 'Network logo updated.',
      )

      window.location.reload()
    } catch {
      toast.error('Upload failed.')
    } finally {
      setUploading(null)
    }
  }

  function handleDrop(
    type: 'banner' | 'logo',
    event: React.DragEvent<HTMLLabelElement>,
  ) {
    event.preventDefault()
    event.stopPropagation()

    setDragging(null)

    if (uploading !== null) return

    const file = event.dataTransfer.files?.[0]

    if (file) {
      void uploadImage(type, file)
    }
  }

  return (
    <div className="space-y-7">
      {/* Banner */}
      <div className="space-y-3">
        <label
          htmlFor="network-banner-upload"
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging('banner')
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging('banner')
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging(null)
          }}
          onDrop={(event) => handleDrop('banner', event)}
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors ${dragging === 'banner'
            ? 'border-primary bg-primary/10'
            : 'border-border bg-muted/30 hover:border-primary hover:bg-muted/50'
            }`}
        >
          <span className="text-sm font-medium text-foreground">
            {uploading === 'banner'
              ? 'Uploading banner…'
              : 'Upload network banner'}
          </span>

          <span className="mt-1 text-xs text-muted-foreground">
            {dragging === 'banner'
              ? 'Drop your image here'
              : 'Click to browse or drag and drop'}
          </span>

          <span className="mt-2 text-xs text-muted-foreground">
            PNG, JPEG, WebP, or GIF · maximum 10 MB
          </span>

          <input
            id="network-banner-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading !== null}
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file) {
                void uploadImage('banner', file)
              }

              event.currentTarget.value = ''
            }}
            className="sr-only"
          />
        </label>

        <div className="aspect-[3/1] overflow-hidden rounded-xl border border-border bg-secondary">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${name} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {name}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  No banner uploaded
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Network Logo</h3>

          <p className="text-xs text-muted-foreground">
            Upload the logo shown with your network.
          </p>
        </div>

        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Network logo"
            className="h-28 w-28 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
            No logo
          </div>
        )}

        <label
          htmlFor="network-logo-upload"
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging('logo')
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging('logo')
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging(null)
          }}
          onDrop={(event) => handleDrop('logo', event)}
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors ${dragging === 'logo'
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted/30 hover:border-primary hover:bg-muted/50'
            }`}
        >
          <span className="text-sm font-medium text-foreground">
            {uploading === 'logo'
              ? 'Uploading logo…'
              : 'Upload network logo'}
          </span>

          <span className="mt-1 text-xs text-muted-foreground">
            {dragging === 'logo'
              ? 'Drop your image here'
              : 'Click to browse or drag and drop'}
          </span>

          <span className="mt-2 text-xs text-muted-foreground">
            PNG, JPEG, WebP, or GIF · maximum 10 MB
          </span>

          <input
            id="network-logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading !== null}
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file) {
                void uploadImage('logo', file)
              }

              event.currentTarget.value = ''
            }}
            className="sr-only"
          />
        </label>
      </div>


      {/* Description */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="network-description"
            className="text-sm font-medium text-foreground"
          >
            Description
          </label>

          <span className="text-xs text-muted-foreground">
            {descriptionValue.length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>

        <textarea
          id="network-description"
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={5}
          placeholder="Describe your network..."
          className="mt-2 w-full resize-none border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
        />
      </div>

      {/* Minecraft Platform */}
      <div>
        <label
          htmlFor="network-platform"
          className="text-sm font-medium text-foreground"
        >
          Platform Support
        </label>

        <select
          id="network-platform"
          value={platformSupportValue}
          onChange={(e) =>
            setPlatformSupportValue(
              e.target.value as PlatformSupport,
            )
          }
          disabled={loading}
          className="mt-2 w-full border border-border bg-secondary px-4 py-3 text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="JAVA_ONLY">Java only</option>
          <option value="BEDROCK_ONLY">Bedrock only</option>
          <option value="JAVA_AND_BEDROCK">
            Java + Bedrock
          </option>
        </select>

        <p className="mt-2 text-xs text-muted-foreground">
          Choose which Minecraft editions players can use to
          connect to this network.
        </p>
      </div>

      {/* Server Addresses */}
      <div className="border border-border bg-secondary/40 p-5">
        <div className="mb-5">
          <p className="font-semibold text-foreground">
            Minecraft Server Addresses
          </p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            These are the public Minecraft addresses players use
            to connect to your server.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="network-java-address"
              className="text-sm font-medium text-foreground"
            >
              Java Address
            </label>

            <input
              id="network-java-address"
              type="text"
              value={javaAddressValue}
              onChange={(e) =>
                setJavaAddressValue(e.target.value)
              }
              maxLength={255}
              placeholder="play.example.com:25565"
              disabled={
                loading ||
                platformSupportValue === 'BEDROCK_ONLY'
              }
              className="mt-2 w-full border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="network-bedrock-address"
              className="text-sm font-medium text-foreground"
            >
              Bedrock Address
            </label>

            <input
              id="network-bedrock-address"
              type="text"
              value={bedrockAddressValue}
              onChange={(e) =>
                setBedrockAddressValue(e.target.value)
              }
              maxLength={255}
              placeholder="play.example.com:19132"
              disabled={
                loading ||
                platformSupportValue === 'JAVA_ONLY'
              }
              className="mt-2 w-full border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Server Information */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="network-game-version"
            className="text-sm font-medium text-foreground"
          >
            Minecraft Version
          </label>

          <input
            id="network-game-version"
            type="text"
            value={gameVersionValue}
            onChange={(e) =>
              setGameVersionValue(e.target.value)
            }
            maxLength={64}
            placeholder="1.21.10"
            disabled={loading}
            className="mt-2 w-full border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="network-region"
            className="text-sm font-medium text-foreground"
          >
            Region
          </label>

          <input
            id="network-region"
            type="text"
            value={regionValue}
            onChange={(e) => setRegionValue(e.target.value)}
            maxLength={64}
            placeholder="Europe"
            disabled={loading}
            className="mt-2 w-full border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
          />
        </div>
      </div>

      {/* Community Links */}
      <div className="border border-border bg-secondary/40 p-5">
        <div className="mb-5">
          <p className="font-semibold text-foreground">
            Community Links
          </p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Optional links players can use to learn more about
            your network or join its community.
          </p>
        </div>

      </div>

      {/* Public Discovery */}
      <div className="border border-border bg-secondary/40 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              Public Discovery
            </p>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Allow players to find this network in the public
              server directory.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={publicListedValue}
            onClick={() =>
              setPublicListedValue((value) => !value)
            }
            disabled={loading}
            className={`relative h-7 w-12 shrink-0 border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${publicListedValue
              ? 'border-primary bg-primary'
              : 'border-border bg-background'
              }`}
          >
            <span
              className={`absolute top-0.5 h-5.5 w-5.5 bg-foreground transition-transform ${publicListedValue
                ? 'translate-x-5.5'
                : 'translate-x-0.5'
                }`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`h-2 w-2 ${publicListedValue
              ? 'bg-primary'
              : 'bg-muted-foreground'
              }`}
          />

          {publicListedValue
            ? 'This network is publicly discoverable.'
            : 'This network is private and hidden from discovery.'}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={loading || uploading !== null}
        className="border border-primary bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}