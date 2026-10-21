import type { VoiceParticipant } from '../types/livekit'

export const roomParticipants = new Map<string, Map<string, VoiceParticipant>>()
