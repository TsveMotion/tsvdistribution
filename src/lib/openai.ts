/**
 * OpenAI integration for AI-generated product descriptions and titles
 */

interface ProductInfo {
  name: string;
  category: string;
  sku: string;
  supplier?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  price?: number;
}

export async function generateProductTitle(productInfo: ProductInfo): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  const prompt = `Generate a professional, SEO-friendly product title for an e-commerce inventory system. 

Product Details:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- SKU: ${productInfo.sku}
${productInfo.supplier ? `- Supplier: ${productInfo.supplier}` : ''}
${productInfo.weight ? `- Weight: ${productInfo.weight} kg` : ''}
${productInfo.dimensions ? `- Dimensions: ${productInfo.dimensions.length}×${productInfo.dimensions.width}×${productInfo.dimensions.height} cm` : ''}
${productInfo.price ? `- Price: £${productInfo.price}` : ''}

Requirements:
- Keep it concise but descriptive (50-80 characters ideal)
- Include key features/benefits
- Make it compelling for customers
- Use proper UK English spelling
- Focus on what makes this product appealing

Generate only the title, no additional text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || productInfo.name;
  } catch (error) {
    console.error('Error generating product title:', error);
    throw error;
  }
}

export async function generateProductDescription(productInfo: ProductInfo): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  const prompt = `Generate a detailed, professional product description for an e-commerce inventory system.

Product Details:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- SKU: ${productInfo.sku}
${productInfo.supplier ? `- Supplier: ${productInfo.supplier}` : ''}
${productInfo.weight ? `- Weight: ${productInfo.weight} kg` : ''}
${productInfo.dimensions ? `- Dimensions: ${productInfo.dimensions.length}×${productInfo.dimensions.width}×${productInfo.dimensions.height} cm` : ''}
${productInfo.price ? `- Price: £${productInfo.price}` : ''}

Requirements:
- Write 2-3 paragraphs (150-300 words)
- Include key features and benefits
- Use persuasive but professional language
- Use proper UK English spelling and currency (£)
- Include technical specifications if relevant
- Make it suitable for both B2B and B2C customers
- End with a brief statement about quality/reliability

Generate only the description, no additional formatting or titles.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || productInfo.name + ' - Professional quality product suitable for various applications.';
  } catch (error) {
    console.error('Error generating product description:', error);
    throw error;
  }
}

export async function generateBothTitleAndDescription(productInfo: ProductInfo): Promise<{
  title: string;
  description: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  const prompt = `Generate both a professional product title and detailed description for an e-commerce inventory system.

Product Details:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- SKU: ${productInfo.sku}
${productInfo.supplier ? `- Supplier: ${productInfo.supplier}` : ''}
${productInfo.weight ? `- Weight: ${productInfo.weight} kg` : ''}
${productInfo.dimensions ? `- Dimensions: ${productInfo.dimensions.length}×${productInfo.dimensions.width}×${productInfo.dimensions.height} cm` : ''}
${productInfo.price ? `- Price: £${productInfo.price}` : ''}

Please generate:
1. TITLE: A concise, SEO-friendly product title (50-80 characters)
2. DESCRIPTION: A detailed product description (150-300 words, 2-3 paragraphs)

Requirements:
- Use proper UK English spelling and currency (£)
- Make it professional and compelling
- Include key features and benefits
- Suitable for both B2B and B2C customers

Format your response as:
TITLE: [generated title]

DESCRIPTION: [generated description]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || '';
    
    // Parse the response
    const titleMatch = content.match(/TITLE:\s*(.+?)(?=\n|$)/i);
    const descriptionMatch = content.match(/DESCRIPTION:\s*([\s\S]+)$/i);
    
    return {
      title: titleMatch?.[1]?.trim() || productInfo.name,
      description: descriptionMatch?.[1]?.trim() || `Professional quality ${productInfo.name} suitable for various applications.`
    };
  } catch (error) {
    console.error('Error generating product content:', error);
    throw error;
  }
}
