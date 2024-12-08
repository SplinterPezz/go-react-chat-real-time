declare module "*.svg" {
  const content: string;
  export default content;
}
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL: string;
      // Add other environment variables here if needed
    }
  }
}
declare var process: {
  env: {
      NODE_ENV: string
  }
  
};
export {};
export default process;