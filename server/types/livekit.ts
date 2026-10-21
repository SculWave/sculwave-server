export interface LiveKitTrack {
  sid: string
  type: string
}

export interface LiveKitParticipant {
  identity: string
  tracks: LiveKitTrack[]
}

export interface LiveKitParticipantsResponse {
  participants: LiveKitParticipant[]
}

export interface SubscriptionUpdate {
  listener: string
  add: VoiceParticipant[]
  remove: VoiceParticipant[]
  desired: Set<string>
}

export interface VoiceParticipant {
  identity: string
  trackSids: string[]
}
