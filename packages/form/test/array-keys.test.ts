import { expect, test } from 'vitest';

import { CreateForm } from '../src/index';

test('preserves runtime keys for a sibling array when another array is mutated', () => {
  const form = new CreateForm({
    defaultValues: {
      items: [{ name: 'item-a' }],
      tags: [{ name: 'tag-a' }],
    },
  });
  const tags = form.array('tags');
  tags.push({ name: 'tag-b' });
  const siblingKeys = [...tags.keys()];

  form.array('items').push({ name: 'item-b' });

  expect(tags.keys()).toEqual(siblingKeys);
});

test('preserves runtime keys for a structurally surviving nested array when its parent moves', () => {
  const form = new CreateForm({
    defaultValues: {
      groups: [
        { members: [{ name: 'member-a' }] },
        { members: [{ name: 'member-b' }] },
      ],
    },
  });
  const movedMembers = form.array(['groups', 1, 'members']);
  movedMembers.push({ name: 'member-c' });
  const nestedKeys = [...movedMembers.keys()];

  form.array('groups').move(1, 0);

  expect(form.array(['groups', 0, 'members']).keys()).toEqual(nestedKeys);
});

test('updates keys for the mutated array in a single-array form', () => {
  const form = new CreateForm({
    defaultValues: {
      items: [{ name: 'item-a' }],
    },
  });
  const items = form.array('items');

  items.push({ name: 'item-b' });

  expect(items.keys()).toEqual(['initial-0', 'item-1']);
});
