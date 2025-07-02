// In a client-side component like components/MapClientComponent.js or your main page
"use client";
import React, { useEffect, useState } from 'react';

export default function TempUserAgentDisplay() {
    const [userAgent, setUserAgent] = useState('');

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setUserAgent(navigator.userAgent);
        }
    }, []);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, background: 'white', padding: '5px', border: '1px solid black', zIndex: 9999, fontSize: '10px' }}>
            User-Agent: {userAgent}
        </div>
    );
}