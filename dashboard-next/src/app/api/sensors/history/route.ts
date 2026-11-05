import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.MQTT_BROKER_URL || "http://dht11-bridge:5000";

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/history`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
