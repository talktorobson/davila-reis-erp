import Link from 'next/link';
import { 
  HomeIcon, 
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo/Branding */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary-dark">
            D'avila Reis Advogados
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Protegemos Seu Negócio e Patrimônio
          </p>
        </div>

        {/* 404 Error */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-6xl font-bold text-accent-gold mb-4">404</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Página não encontrada
          </h2>
          <p className="text-gray-600 mb-6">
            A página que você está procurando não existe ou foi movida.
          </p>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 w-full bg-accent-gold text-white py-3 px-4 rounded-lg hover:bg-accent-gold-light transition-colors"
            >
              <UserCircleIcon className="h-5 w-5" />
              Acessar Portal do Cliente
            </Link>
            
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full bg-primary-dark text-white py-3 px-4 rounded-lg hover:bg-primary-blue transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              Voltar ao Site
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Precisa de ajuda?
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <PhoneIcon className="h-4 w-4 text-accent-gold" />
              <span className="text-gray-700">
                <strong>Telefone:</strong> (15) 3384-4013
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-4 w-4 text-accent-gold" />
              <span className="text-gray-700">
                <strong>Email:</strong> financeiro@davilareisadvogados.com.br
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Clientes:</strong> Se você está tentando acessar o portal, 
              clique em "Acessar Portal do Cliente" acima.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-500">
          © 2025 D'avila Reis Advogados. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}