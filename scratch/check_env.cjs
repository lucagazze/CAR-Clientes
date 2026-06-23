console.log('Environment keys related to Google/Gemini/API:');
console.log(Object.keys(process.env).filter(k => 
  k.toLowerCase().includes('gemini') || 
  k.toLowerCase().includes('google') || 
  k.toLowerCase().includes('key')
));
