[![Build Size](https://img.shields.io/bundlephobia/minzip/@ilokesto/utilinent?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=@ilokesto/utilinent)
[![Version](https://img.shields.io/npm/v/@ilokesto/utilinent?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@ilokesto/utilinent)
[![Downloads](https://img.shields.io/npm/dt/@ilokesto/utilinent.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@ilokesto/utilinent)


&nbsp;

[Official documents](https://ilokesto.vercel.app/utilinent)

&nbsp;

As React apps grow, JSX often becomes cluttered with nested ternary operators and bloated map callbacks, which rapidly degrades readability. utilinent was created to solve these recurring UI patterns by providing small, declarative components.

Inspired by the concise and expressive style of SolidJS, utilinent encapsulates common tasks — conditional rendering, list rendering, and lazy loading — into clear APIs. For example, replace complex ternaries with a `Show` component, or use `For` to render arrays along with a built-in fallback for empty data.

By moving noisy logic out of views and into reusable components, utilinent improves readability, maintainability, and lets developers focus more on business logic while boosting team productivity.

&nbsp;

##  Installation

utilinent can be installed using several methods listed below.

```bash
npm install @ilokesto/utilinent
pnpm add @ilokesto/utilinent
yarn add @ilokesto/utilinent
bun add @ilokesto/utilinent
```

&nbsp;

## Quick start

When handling async data in React, it's common to render different UI for loading, empty, or populated states. The examples below show typical patterns and how utilinent components simplify them.

```tsx
import React, { useState, useEffect } from 'react';
  
const UserList = () => {
  const { data: users } = useQuery( ... )

  return (
    <div>
      <h2>User List</h2>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        users.length > 0 ? (
          <ul>
            {users.map(user => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        ) : (
          <p>No users found.</p>
        )
      )}
    </div>
  );
};
  
export default UserList;
```

utilinent's `Show` and `For` components make conditional and list rendering more declarative and concise. They help express loading and list states clearly so your UI intent is easier to read and maintain.

```tsx
import React, { useState, useEffect } from 'react';
import { Show, For } from '@ilokesto/utilinent';

const UserListAfter = () => {
  const { data: users } = useQuery( ... )

  return (
    <div>
      <h2>User List</h2>
      <Show when={!loading} fallback={<p>Loading users...</p>}>
        <For.ul each={users} fallback={<p>No users found.</p>}>
          {(user) => (
            <li key={user.id}>{user.name}</li>
          )}
        </For.ul>
      </Show>
    </div>
  );
};

export default UserListAfter;
```

&nbsp;

## Custom proxy components

If you want to build your own `Show`-style component (for example, `Clickable`),
there is a short guide in the repo:

- `CUSTOM_CLICKABLE.md`
