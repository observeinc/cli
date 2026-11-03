declare module "@npmcli/arborist" {
  export default class Arborist {
    constructor(options: { path: string });
    loadVirtual(): Promise<unknown>;
  }
}
