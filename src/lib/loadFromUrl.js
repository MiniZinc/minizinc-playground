const allowedExtensions = [
    '.mzn',
    '.mzc',
    '.dzn',
    '.json',
    '.html',
    '.js',
    '.css',
];

export async function loadFromUrl(url) {
    const src =
        url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `http://${url}`;
    const name = src.split('/').pop();
    if (
        !name.endsWith('.mzp') &&
        allowedExtensions.every((ext) => !name.endsWith(ext))
    ) {
        throw new Error('File type not recognised');
    }
    const response = await fetch(new URL(src));
    if (!response.ok) {
        throw new Error(
            `Request failed (${response.status} ${response.statusText})`
        );
    }
    if (name.endsWith('.mzp')) {
        const project = await response.json();
        const files = [];
        const openFile = project.openFiles[project.openTab];
        let tab = 0;
        for (const file of project.projectFiles) {
            const name = file.split('/').pop();
            if (allowedExtensions.every((ext) => !name.endsWith(ext))) {
                continue;
            }
            if (file === openFile) {
                tab = files.length;
            }
            const res = await fetch(new URL(file, src));
            if (!res.ok) {
                throw new Error(
                    `Request failed (${res.status} ${res.statusText})`
                );
            }
            const contents = await res.text();
            files.push({
                name,
                contents,
                hidden: project.openFiles.indexOf(file) === -1,
            });
        }
        let solverId = project.selectedBuiltinConfigId;
        if (solverId === 'org.gecode.gecode') {
            solverId = 'org.minizinc.gecode_presolver';
        } else if (solverId === 'org.chuffed.chuffed') {
            solverId = 'org.minizinc.chuffed';
        }
        return {
            files,
            tab,
            solverId,
        };
    } else {
        const contents = await response.text();
        return { files: [{ name, contents }] };
    }
}
