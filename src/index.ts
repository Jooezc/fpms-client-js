class FpmsConnector {
//   private _client = WebSocket;

  hello(name: string) {
    return `hello ${name}!`;
  }
}

export const fpms = new FpmsConnector();
