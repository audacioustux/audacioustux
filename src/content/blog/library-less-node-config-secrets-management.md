---
author: Tanjim Hossain
pubDatetime: 2020-02-11T18:27:53Z
title: Library-less node config & secrets management
postSlug: library-less-node-config-secrets-management
featured: false
draft: false
tags:
  - typescript
  - javascript
  - proxy
  - secrets
  - configs
  - tips
  - env
  - english
ogImage: "assets/random/library-less-node-config-secrets-management.png"
description: A simple way to manage secrets and configs in nodejs without using any library.
---

## use bash script; instead of `dotenv` dependency

make ./bin/export.sh with:

```bash
#!/usr/bin/env bash

DOT_ENV="$1"
EXEC=${@:2}

set -a
source $DOT_ENV
set +a

$EXEC
```

now to use this with nodemon:

```json
{
  "delay": 0,
  "verbose": true,
  "watch": ["src"],
  "ignore": ["**/*.spec.ts", "**/*.test.ts", ".git", "**/node_modules"],
  "env": {
    "nodemon": 1,
    "DEBUG": "*"
  },
  "exec": "npm run build && ./bin/export.sh .env npm start",
  "ext": "js,json,ts"
}
```

ignore other attributes. see how `./bin/export.sh .env` is used in exec value.

but,

- don't forget to `chmod +x ./bin/export.sh`
- this only works on linux (& probably on mac)
- not recommended for use with docker. you would use docker/k8s secrets or other methods anyway `¯\(ツ)/¯`

## use centralized config file; instead of node-config dependency

```typescript
import crypto from "crypto";

const { NODE_ENV = "production" } = process.env;

const isDev = NODE_ENV === "development";

// safe for all environment
const safeDefs: NodeJS.ProcessEnv = {
  PORT: "4000",
};

// safe defaults for production environment
const prodDefs: NodeJS.ProcessEnv = { ...safeDefs };

// safe defaults for development environment
const devDefs: NodeJS.ProcessEnv = {
  ...safeDefs,
  REDIS_CONNECTION_STRING: "redis://redis",
  PG_CONNECTION_STRING: "postgres://postgres:password@postgres/nobinalo",
  ES_NODE: "http://elasticsearch:9200",
  EMAIL_VERIFICATION_SECRET: crypto.randomBytes(48).toString("base64"),
  PHONE_NO_VERIFICATION_SECRET: crypto.randomBytes(48).toString("base64"),
  AUTH_JWT_SECRET: crypto.randomBytes(33).toString("base64"),
};

const env = new Proxy(process.env, {
  get: (env, key: string): string => {
    const value = env[key];
    const devValue = devDefs[key];
    const prodValue = prodDefs[key];
    if (value) return value;
    if (isDev && devValue) return devValue;
    if (!isDev && prodValue) return prodValue;

    throw new Error(`Environment Variable '${key}' is missing!`);
  },
}) as Record<string, string>;

const {
  PG_CONNECTION_STRING,
  REDIS_CONNECTION_STRING,
  SENDGRID_API_KEY,
  PORT,
  EMAIL_VERIFICATION_SECRET,
  PHONE_NO_VERIFICATION_SECRET,
  AUTH_JWT_SECRET,
  ES_NODE,
} = env;

const config = {
  isDev,
  NODE_ENV,
  SECRETS: {
    EMAIL_VERIFICATION_SECRET,
    PHONE_NO_VERIFICATION_SECRET,
    AUTH_JWT_SECRET,
  },
  PORT,
  knex: {
    connection: PG_CONNECTION_STRING,
  },
  redis: { REDIS_CONNECTION_STRING },
  elasticsearch: {
    node: ES_NODE,
  },
  sendgrid: {
    SENDGRID_API_KEY,
  },
};

export default config;
```

usage:

```typescript
import config from "../config";

const {
  redis: { REDIS_CONNECTION_STRING },
} = config;
```

this will,

- fail in production mode
- use 'redis://redis' in development mode
