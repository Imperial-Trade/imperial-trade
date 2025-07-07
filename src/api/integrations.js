
// Mock implementations for file upload and AI functionality
// These would normally connect to external APIs

export const UploadFile = async ({ file }) => {
  // Mock file upload - in production this would upload to Supabase Storage or another service
  console.log('Mock file upload:', file.name);
  
  // Return a mock URL
  return {
    file_url: `https://mock-storage.example.com/uploads/${Date.now()}-${file.name}`
  };
};

export const InvokeLLM = async ({ prompt, file_urls = [] }) => {
  // Mock AI response - in production this would call OpenAI or another AI service
  console.log('Mock AI invocation:', { prompt, file_urls });
  
  // Return mock positive feedback based on the prompt
  const responses = [
    "Great job on identifying the key market levels! Your analysis shows strong technical understanding.",
    "Excellent risk management approach. Setting clear stop losses demonstrates professional discipline.",
    "Your patience in waiting for the right setup paid off. This kind of selective trading is what separates successful traders.",
    "Well done on documenting your thought process. This level of self-reflection will accelerate your growth.",
    "Smart entry timing! You caught the momentum shift perfectly with good confirmation signals.",
    "Your position sizing strategy shows maturity. Protecting capital is the foundation of long-term success."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};
