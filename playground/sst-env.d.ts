/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */

declare module "sst" {
  export interface Resource {
    BLOB: {
      type: "sst.cloudflare.Bucket";
    };
    CACHE: {
      type: "sst.cloudflare.Kv";
    };
    DB: {
      type: "sst.cloudflare.D1";
    };
    Env: {
      type: "sst.sst.Secret";
      value: string;
    };
    KV: {
      type: "sst.cloudflare.Kv";
    };
  }
}
/// <reference path="sst-env.d.ts" />

import "sst";
export {};
