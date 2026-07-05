import type { Config } from "tailwindcss";
const config: Config = {content:["./app/**/*.{js,ts,jsx,tsx}","./components/**/*.{js,ts,jsx,tsx}"],theme:{extend:{colors:{gold:"#D4AF37",night:"#07111F",panel:"#0F1B2D"},boxShadow:{glow:"0 0 60px rgba(212,175,55,.22)"}}},plugins:[]};
export default config;
