// OPFS Worker - handles file operations in a dedicated thread

export interface OPFSWorkerMessage {
  type: 'save' | 'get' | 'delete' | 'list';
  payload: {
    path?: string;
    data?: ArrayBuffer;
  };
}

export interface OPFSWorkerResponse {
  type: 'success' | 'error';
  data?: ArrayBuffer | string[];
  error?: string;
}

// Worker message handler
self.onmessage = async (event: MessageEvent<OPFSWorkerMessage>) => {
  // TODO: Implement OPFS worker message handling
};
