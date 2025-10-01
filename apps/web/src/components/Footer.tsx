export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Copyright © {new Date().getFullYear()}{' '}
            <a 
              href="https://www.lgger.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Lgger Analytics Limited
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
