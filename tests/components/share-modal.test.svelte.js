import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import ShareModal from '../../src/lib/ShareModal.svelte';

const project = {
    files: [{ name: 'model.mzn', contents: 'int: x;' }],
    tab: 0,
};

test('offers a link tab and generates iframe code from the embed configuration', async () => {
    render(ShareModal, {
        active: true,
        shareUrl: 'https://play.minizinc.dev/#project=example',
        project,
    });

    expect(screen.getByDisplayValue(/#project=example/)).toBeInTheDocument();

    await fireEvent.click(screen.getByText('Embed'));

    expect(screen.getByText('Advanced options')).toBeInTheDocument();
    const embedOptions = screen.getByLabelText('Embed options (JSON)');
    expect(embedOptions.value).toContain('"theme": "auto"');
    const iframeCode = screen.getByLabelText('Iframe code');
    expect(iframeCode.value).toContain('<iframe');
    expect(iframeCode.value).toContain('#embed=');

    await fireEvent.input(embedOptions, {
        target: { value: '{"project": {}}' },
    });
    expect(
        screen.getByText(/Unknown embed option: project/),
    ).toBeInTheDocument();
    expect(
        screen.getByRole('button', { name: 'Copy iframe code' }),
    ).toBeDisabled();
});
