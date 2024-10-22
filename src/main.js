import './style.scss';
import './app.scss';
import App from './App.svelte';
import { mount } from 'svelte';

const app = mount(App, {
    target: document.getElementById('app'),
});

export default app;
