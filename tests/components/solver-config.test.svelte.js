import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import SolverConfig from '../../src/lib/SolverConfig.svelte';

test('loads, saves, resets, and filters solver options by solver flags', async () => {
    const { component } = render(SolverConfig, {
        active: true,
        stdFlags: ['-a', '-f', '-v', '-s'],
    });

    component.load({
        enableTimeLimit: true,
        timeLimit: 2,
        allSolutions: true,
        freeSearch: true,
        verboseSolving: true,
        solvingStatistics: true,
    });

    expect(component.save()).toMatchObject({
        enableTimeLimit: true,
        timeLimit: 2,
        allSolutions: true,
        freeSearch: true,
        verboseSolving: true,
        solvingStatistics: true,
    });
    expect(component.isDefault()).toBe(false);
    expect(component.getSolvingConfiguration('org.test.solver')).toMatchObject({
        solver: 'org.test.solver',
        'time-limit': 2000,
        'all-satisfaction': true,
        'free-search': true,
        'verbose-solving': true,
        'solver-statistics': true,
    });

    await fireEvent.click(screen.getByText('Reset to defaults'));

    expect(component.isDefault()).toBe(true);
    expect(component.getCompilationConfiguration('org.test.solver')).toEqual({
        solver: 'org.test.solver',
    });
});
