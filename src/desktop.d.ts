export {};
declare global {
  interface Window {
    ultronDesktop: {
      run(command: Record<string, unknown>): Promise<any>;
      systemCheck(): Promise<any>;
      onCheckResult(callback:(result:any)=>void):()=>void;
      status(): Promise<any>;
      openManager(): Promise<any>;
      voice(path: string, body: unknown): Promise<{status:number;data:any}>;
      onState(callback:(state:any)=>void):()=>void;
    };
  }
}
