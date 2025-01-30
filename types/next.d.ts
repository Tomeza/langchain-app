declare module 'next' {
  export interface NextApiRequest extends Request {
    query: {
      [key: string]: string | string[];
    };
    cookies: {
      [key: string]: string;
    };
    body: any;
  }

  export interface NextApiResponse {
    status(code: number): NextApiResponse;
    json(body: any): void;
    send(body: any): void;
    end(): void;
  }
}

declare module 'next/server' {
  export { NextRequest, NextResponse } from 'next/dist/server/web/spec-extension/request';
} 