'use client';

export default function NumberedAction ({content=''}) {

    return (
        <div className="inline-flex items-center justify-center sm:bottom-2 sm:right-12 h-8 w-8 sm:w-10 sm:h-10 mr-4 px-2 min-w-1-25rem bg-gray-300 border-0 border-white text-black text-md sm:text-xl font-medium sm:font-extrabold rounded-full shadow-lg">
            {content}
        </div>
    )
} 