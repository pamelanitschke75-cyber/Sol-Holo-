package com.solholo.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WhatsAppDrivingModePlugin.class);
        registerPlugin(HeyHoSolPlugin.class);
        registerPlugin(SolAudioRoutePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
