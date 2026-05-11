import { Duplex, Readable, Writable } from 'stream';

type InvokeOptions = {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function invokeApp(
  app: (req: any, res: any) => void,
  options: InvokeOptions
) {
  const bodyText = options.body === undefined ? '' : JSON.stringify(options.body);

  const req = new Readable({
    read() {
      this.push(bodyText || null);
      this.push(null);
    },
  }) as Readable & Record<string, any>;

  req.method = options.method;
  req.url = options.url;
  req.originalUrl = options.url;
  req.headers = {
    host: 'localhost',
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(bodyText).toString(),
    ...(options.headers || {}),
  };
  const socket = new Duplex({
    read() {},
    write(_chunk, _encoding, callback) {
      callback();
    },
  }) as Duplex & { remoteAddress?: string };
  socket.remoteAddress = '127.0.0.1';
  req.connection = socket;
  req.socket = socket;

  let responseBody = '';
  const headers: Record<string, string> = {};

  const res = new Writable({
    write(chunk, _encoding, callback) {
      responseBody += chunk.toString();
      callback();
    },
  }) as Writable & Record<string, any>;

  res.statusCode = 200;
  res.setHeader = (name: string, value: string) => {
    headers[name.toLowerCase()] = value;
  };
  res.getHeader = (name: string) => headers[name.toLowerCase()];
  res.getHeaders = () => headers;
  res.removeHeader = (name: string) => {
    delete headers[name.toLowerCase()];
  };
  res.writeHead = (statusCode: number, maybeHeaders?: Record<string, string>) => {
    res.statusCode = statusCode;
    if (maybeHeaders) {
      Object.entries(maybeHeaders).forEach(([key, value]) => res.setHeader(key, value));
    }
    return res;
  };

  const done = new Promise<{ status: number; json: any; text: string; headers: Record<string, string> }>((resolve) => {
    res.end = (chunk?: Buffer | string) => {
      if (chunk) {
        responseBody += chunk.toString();
      }
      resolve({
        status: res.statusCode,
        json: responseBody ? JSON.parse(responseBody) : null,
        text: responseBody,
        headers,
      });
      return res;
    };
  });

  app(req, res);
  return done;
}
