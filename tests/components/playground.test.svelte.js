import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
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
