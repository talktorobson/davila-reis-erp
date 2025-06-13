"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { LeadFormData } from '@/types';

// Validation schema
const leadSchema = yup.object().shape({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: yup
    .string()
    .required('Email é obrigatório')
    .email('Email deve ter um formato válido'),
  phone: yup
    .string()
    .required('Telefone é obrigatório')
    .matches(
      /^(\+55\s?)?(\(?[1-9]{2}\)?\s?)?([9]?\d{4}[-\s]?\d{4})$/,
      'Telefone deve ter um formato válido (ex: (11) 99999-9999)'
    ),
  company: yup
    .string()
    .max(255, 'Nome da empresa deve ter no máximo 255 caracteres'),
  message: yup
    .string()
    .max(2000, 'Mensagem deve ter no máximo 2000 caracteres'),
});

interface LeadCaptureFormProps {
  variant?: 'hero' | 'modal' | 'inline';
  onSuccess?: () => void;
  utmCampaign?: string;
  source?: string;
}

const LeadCaptureForm = ({ 
  variant = 'inline', 
  onSuccess,
  utmCampaign,
  source = 'Website' 
}: LeadCaptureFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormData>({
    resolver: yupResolver(leadSchema) as any,
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          source,
          utmCampaign,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar formulário');
      }

      setSubmitSuccess(true);
      reset();
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'Erro ao enviar formulário. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHeroVariant = variant === 'hero';
  const isModalVariant = variant === 'modal';

  if (submitSuccess) {
    return (
      <div className={`${isHeroVariant ? 'bg-white/10 backdrop-blur-md' : 'bg-green-50'} p-6 rounded-lg border ${isHeroVariant ? 'border-white/20' : 'border-green-200'}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isHeroVariant ? 'text-white' : 'text-green-800'}`}>
            Mensagem Enviada com Sucesso!
          </h3>
          <p className={`text-sm ${isHeroVariant ? 'text-white/90' : 'text-green-700'}`}>
            Nossa equipe entrará em contato em até 24 horas para oferecer uma consultoria gratuita.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href="tel:+551533844013"
              className="inline-flex items-center justify-center px-4 py-2 bg-accent-gold text-primary-dark font-semibold rounded-md hover:bg-accent-gold-light transition-colors duration-300"
            >
              📞 Falar Agora: (15) 3384-4013
            </a>
            <a
              href="https://wa.me/5515999999999?text=Olá! Acabei de enviar uma solicitação de consultoria pelo site."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors duration-300"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isHeroVariant ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-law border border-gray-200'} p-6 rounded-lg`}>
      {!isModalVariant && (
        <div className="mb-6 text-center">
          <h3 className={`text-xl font-semibold mb-2 ${isHeroVariant ? 'text-white' : 'text-primary-dark'}`}>
            Consultoria Jurídica Gratuita
          </h3>
          <p className={`text-sm ${isHeroVariant ? 'text-white/90' : 'text-gray-600'}`}>
            Preencha os dados abaixo e nossa equipe entrará em contato em até 24 horas
          </p>
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isHeroVariant ? 'text-white' : 'text-gray-700'}`}>
            Nome Completo *
          </label>
          <input
            type="text"
            {...register('name')}
            className={`w-full px-4 py-3 rounded-md transition-all duration-300 ${
              isHeroVariant 
                ? 'form-input text-white placeholder-white/60' 
                : 'border border-gray-300 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold'
            }`}
            placeholder="Seu nome completo"
          />
          {errors.name && (
            <p className={`mt-1 text-xs ${isHeroVariant ? 'text-red-300' : 'text-red-600'}`}>
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isHeroVariant ? 'text-white' : 'text-gray-700'}`}>
            Email *
          </label>
          <input
            type="email"
            {...register('email')}
            className={`w-full px-4 py-3 rounded-md transition-all duration-300 ${
              isHeroVariant 
                ? 'form-input text-white placeholder-white/60' 
                : 'border border-gray-300 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold'
            }`}
            placeholder="seu@email.com"
          />
          {errors.email && (
            <p className={`mt-1 text-xs ${isHeroVariant ? 'text-red-300' : 'text-red-600'}`}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isHeroVariant ? 'text-white' : 'text-gray-700'}`}>
            Telefone/WhatsApp *
          </label>
          <input
            type="tel"
            {...register('phone')}
            className={`w-full px-4 py-3 rounded-md transition-all duration-300 ${
              isHeroVariant 
                ? 'form-input text-white placeholder-white/60' 
                : 'border border-gray-300 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold'
            }`}
            placeholder="(15) 99999-9999"
          />
          {errors.phone && (
            <p className={`mt-1 text-xs ${isHeroVariant ? 'text-red-300' : 'text-red-600'}`}>
              {errors.phone.message}
            </p>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isHeroVariant ? 'text-white' : 'text-gray-700'}`}>
            Empresa (opcional)
          </label>
          <input
            type="text"
            {...register('company')}
            className={`w-full px-4 py-3 rounded-md transition-all duration-300 ${
              isHeroVariant 
                ? 'form-input text-white placeholder-white/60' 
                : 'border border-gray-300 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold'
            }`}
            placeholder="Nome da sua empresa"
          />
          {errors.company && (
            <p className={`mt-1 text-xs ${isHeroVariant ? 'text-red-300' : 'text-red-600'}`}>
              {errors.company.message}
            </p>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${isHeroVariant ? 'text-white' : 'text-gray-700'}`}>
            Como podemos ajudar? (opcional)
          </label>
          <textarea
            {...register('message')}
            rows={3}
            className={`w-full px-4 py-3 rounded-md transition-all duration-300 resize-none ${
              isHeroVariant 
                ? 'form-input text-white placeholder-white/60' 
                : 'border border-gray-300 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold'
            }`}
            placeholder="Descreva sua necessidade jurídica..."
          />
          {errors.message && (
            <p className={`mt-1 text-xs ${isHeroVariant ? 'text-red-300' : 'text-red-600'}`}>
              {errors.message.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-6 py-3 font-semibold rounded-md transition-all duration-300 ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-accent-gold hover:bg-accent-gold-light hover:transform hover:-translate-y-1 hover:shadow-gold'
          } text-primary-dark`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Enviando...
            </span>
          ) : (
            'Solicitar Consultoria Gratuita'
          )}
        </button>

        <div className={`text-center text-xs ${isHeroVariant ? 'text-white/80' : 'text-gray-500'}`}>
          <p>
            🔒 Seus dados estão protegidos pela LGPD. 
            <br />
            Não compartilhamos informações com terceiros.
          </p>
        </div>
      </form>
    </div>
  );
};

export default LeadCaptureForm;