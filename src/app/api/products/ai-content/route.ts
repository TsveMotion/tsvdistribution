import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { generateProductTitle, generateProductDescription, generateBothTitleAndDescription } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productInfo, type } = await request.json();

    if (!productInfo || !productInfo.name || !productInfo.category) {
      return NextResponse.json(
        { error: 'Product name and category are required' },
        { status: 400 }
      );
    }

    try {
      let result;
      
      switch (type) {
        case 'title':
          result = { title: await generateProductTitle(productInfo) };
          break;
        case 'description':
          result = { description: await generateProductDescription(productInfo) };
          break;
        case 'both':
        default:
          result = await generateBothTitleAndDescription(productInfo);
          break;
      }

      return NextResponse.json(result);
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return NextResponse.json(
        { error: 'Failed to generate content. Please check your OpenAI API key configuration.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in AI content generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
