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

  const prompt = `You are writing a marketplace (Vinted-style) listing title. Write a concise, SEO-friendly title focused ONLY on the product. Do not mention any shop names or prices. Use UK English.

Product Details:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- SKU: ${productInfo.sku}
${productInfo.supplier ? `- Supplier: ${productInfo.supplier}` : ''}
${productInfo.weight ? `- Weight: ${productInfo.weight} kg` : ''}
${productInfo.dimensions ? `- Dimensions: ${productInfo.dimensions.length}×${productInfo.dimensions.width}×${productInfo.dimensions.height} cm` : ''}

Requirements:
- 50–80 characters, concise yet descriptive
- Include relevant keywords (brand/model/material/size if applicable)
- No price, no store/company mentions
- No emojis in the title

Return ONLY the title (no quotes, no extra text).`;

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

  const prompt = `Write a Vinted-style product description focused ONLY on the product. Do NOT mention any shop name (e.g., TsvStock) or price/discounts. Use UK English.

Product Details:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- SKU: ${productInfo.sku}
${productInfo.supplier ? `- Supplier: ${productInfo.supplier}` : ''}
${productInfo.weight ? `- Weight: ${productInfo.weight} kg` : ''}
${productInfo.dimensions ? `- Dimensions: ${productInfo.dimensions.length}×${productInfo.dimensions.width}×${productInfo.dimensions.height} cm` : ''}

Style & Structure:
- 120–220 words total
- Start with a short, SEO-friendly intro sentence (no price, no store)
- Then a features list using emoji checkmarks like: ✅ Feature, ✅ Benefit
- Optionally include size/material/fit/specs if present
- End with a friendly CTA that always mentions fast shipping (e.g., "Fast shipping 🚚💨")

Strict rules:
- Never mention price, discounts, or company/store names
- Optimise for search with natural keywords
- Use emojis only in the bullet list and CTA, not excessively

Return ONLY the description text (no headings or labels).`;

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

  const prompt = `Generate BOTH a Vinted-style product title and description.

Product Details:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- SKU: ${productInfo.sku}
${productInfo.supplier ? `- Supplier: ${productInfo.supplier}` : ''}
${productInfo.weight ? `- Weight: ${productInfo.weight} kg` : ''}
${productInfo.dimensions ? `- Dimensions: ${productInfo.dimensions.length}×${productInfo.dimensions.width}×${productInfo.dimensions.height} cm` : ''}

Please generate:
1. TITLE: 50–80 characters, SEO-friendly, no emojis, no price, no store names
2. DESCRIPTION: 120–220 words, intro + emoji checklist (✅ ...) for features, end with fast shipping mention (e.g., "Fast shipping 🚚💨"). No price or store names.

Strict rules:
- Focus ONLY on the product
- UK English
- No pricing info or company names (e.g., never mention TsvStock)

Format response exactly as:
TITLE: [title]

DESCRIPTION: [description]`;

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
