import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Send Telegram notification via OpenClaw CLI
    const notifyCommand = `openclaw message send --channel telegram --target clifton --message "${message.replace(/"/g, '\\"')}"`;
    
    try {
      const { execSync } = require('child_process');
      execSync(notifyCommand, { stdio: 'pipe' });
      console.log('Telegram notification sent:', message);
    } catch (execError) {
      console.error('OpenClaw message failed:', execError);
      // Fallback to console log if OpenClaw fails
      console.log('Pipeline Notification (fallback):', message);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telegram notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}