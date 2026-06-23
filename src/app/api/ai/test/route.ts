import { NextRequest, NextResponse } from 'next/server';
import { generatePlantEvolution } from '@/services/aiService';
import { generateRandomDNA } from '@/services/dnaService';
import { PlantDNA } from '@/types';
import { saveToLocalHistory, getLocalHistory } from '@/lib/logger';

export async function GET() {
  const history = getLocalHistory();
  return NextResponse.json(history);
}

export async function POST(req: NextRequest) {
  try {
    const { dna, stage, previousDescription, imageModel, isChatMode } = await req.json();

    let finalDna = dna;
    let finalStage = stage;

    if (isChatMode) {
      finalDna = generateRandomDNA();
      finalStage = 'debug';
    }

    if (!finalDna || !finalStage) {
      return NextResponse.json({ error: 'DNA and stage are required' }, { status: 400 });
    }

    const result = await generatePlantEvolution(
      finalDna as PlantDNA,
      finalStage as string,
      previousDescription as string | undefined,
      imageModel as string | undefined
    );

    // Salvar localmente em vez de no Supabase
    saveToLocalHistory({
      dna: finalDna,
      stage: finalStage,
      visualDescription: result.visualDescription,
      imageUrl: result.imageUrl,
      model: imageModel || 'default'
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Test AI] CRITICAL ERROR:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
