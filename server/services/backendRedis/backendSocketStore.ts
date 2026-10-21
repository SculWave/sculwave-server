class BackendSocketStore {
  private sockets = new Map<string, string>()

  set(backendId: string, socketId: string) {
    this.sockets.set(backendId, socketId)
  }

  get(backendId: string) {
    return this.sockets.get(backendId)
  }

  delete(backendId: string) {
    this.sockets.delete(backendId)
  }
}

export const backendSocketStore = new BackendSocketStore()
