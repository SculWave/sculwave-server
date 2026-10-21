export interface RoomLocation {
  instanceId: string
  backendId: string
}

export const roomIndex = new Map<string, RoomLocation>()
