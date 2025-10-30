import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ text = "Analyzing conversation..." }) => (
    <div className="flex flex-col items-center justify-center gap-4 my-8">
        <Loader2 className="w-12 h-12 text-stone-700 animate-spin" />
        <p className="text-slate-600 text-lg">{text}</p>
    </div>
);

export default LoadingSpinner;