import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Dropdown from '../../src/lib/Dropdown.svelte';
import Tabs from '../../src/lib/Tabs.svelte';

test('renders project files and exposes file-management controls', async () => {
    render(Tabs, {
        files: [
            { name: 'model.mzn' },
            { name: 'data.dzn' },
            { name: 'hidden.json', hidden: true },
        ],
        currentIndex: 0,
    });

    expect(screen.getByText('model.mzn')).toBeInTheDocument();
    expect(screen.getByText('data.dzn')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    expect(screen.getByTitle('Add new file')).toBeInTheDocument();
    expect(screen.getByTitle('Manage files')).toBeInTheDocument();

    await fireEvent.click(screen.getByText('data.dzn'));
    expect(screen.getByText('data.dzn')).toBeInTheDocument();
});

test('hides editing controls for a read-only playground', () => {
    render(Tabs, { files: [{ name: 'model.mzn' }], readonly: true });

    expect(screen.queryByTitle('Add new file')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Manage files')).not.toBeInTheDocument();
});

test('passes the rename payload directly to the callback', async () => {
    let renamed;
    render(Tabs, {
        files: [{ name: 'model.mzn' }],
        onrename: (payload) => (renamed = payload),
    });

    await fireEvent.click(screen.getByText('model.mzn'));
    const input = screen.getByDisplayValue('model');
    await fireEvent.input(input, { target: { value: 'renamed' } });
    await fireEvent.blur(input);

    expect(renamed).toEqual({ index: 0, name: 'renamed', suffix: '.mzn' });
});

test('passes the selected dropdown item directly to the callback', async () => {
    let selected;
    const items = [{ label: 'Latest' }, { label: 'Edge' }];
    render(Dropdown, {
        items,
        currentItem: items[0],
        onselectItem: (payload) => (selected = payload),
    });

    await fireEvent.click(screen.getAllByRole('button', { name: /Latest/ })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'Edge' }));

    expect(selected).toEqual({ item: items[1] });
});
