export default function Home() {
  return (
    <>
      {/* Navigation */}
      <nav>
        <div className="nav-container">
          <a href="#home" className="logo">
            <div className="logo-symbol">
              <div className="logo-triangle">
                <span className="logo-dr">DR</span>
              </div>
            </div>
            <div className="logo-text">
              <div className="logo-name">D'avila Reis</div>
              <div className="logo-subtitle">Advogados</div>
            </div>
          </a>
          <ul className="nav-links">
            <li><a href="#home">Início</a></li>
            <li><a href="#servicos">Serviços</a></li>
            <li><a href="#sobre">Sobre</a></li>
            <li><a href="#equipe">Equipe</a></li>
            <li><a href="#carreiras">Carreiras</a></li>
            <li><a href="#contato">Contato</a></li>
            <li><a href="/portal" className="portal-btn">Portal do Cliente</a></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <h1>Protegemos Seu <span className="highlight">Negócio</span>.<br />Blindamos Seu <span className="highlight">Patrimônio</span>.</h1>
          <p className="tagline">Transformando desafios jurídicos em oportunidades desde 2004</p>
          <p className="hero-description">
            20 anos especializados em direito empresarial e trabalhista preventivo. 
            Defendemos empresários contra processos que podem atingir seu patrimônio pessoal.
          </p>
          <div className="hero-buttons">
            <a href="#contato" className="btn-primary">
              Consultoria Gratuita →
            </a>
            <a href="/portal" className="btn-secondary">
              Acessar Portal do Cliente
            </a>
          </div>
          <div className="trust-indicators">
            <div className="trust-item">
              <span className="trust-number">2.500+</span>
              <span className="trust-text">Processos Gerenciados</span>
            </div>
            <div className="trust-item">
              <span className="trust-number">200+</span>
              <span className="trust-text">Clientes Protegidos</span>
            </div>
            <div className="trust-item">
              <span className="trust-number">20</span>
              <span className="trust-text">Anos no Mercado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <div className="container">
          <div className="problem-content">
            <h2><span className="problem-highlight">99% dos Empresários Não Sabem:</span><br />Processos Trabalhistas Podem Atingir Seu Patrimônio Pessoal</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">3M+</div>
                <h3>Processos Trabalhistas</h3>
                <p>São abertos anualmente no Brasil segundo o TST</p>
              </div>
              <div className="stat-card">
                <div className="stat-number">99%</div>
                <h3>Patrimônio em Risco</h3>
                <p>Casos de inadimplência empresarial atingem bens pessoais dos sócios</p>
              </div>
              <div className="stat-card">
                <div className="stat-number">R$ 500k+</div>
                <h3>Valor Médio</h3>
                <p>Das condenações trabalhistas em empresas de médio porte</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section" id="servicos">
        <div className="container">
          <h2 className="section-title">Nossa Metodologia de Blindagem Empresarial</h2>
          <p className="section-subtitle">Estratégias preventivas e defensivas para proteger sua empresa e patrimônio pessoal</p>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🛡️</div>
              <h3>Consultoria Preventiva</h3>
              <p>Auditoria completa dos seus processos trabalhistas, criação de políticas internas e treinamento de equipes para prevenir litígios.</p>
              <a href="#contato" className="service-link">Saiba mais →</a>
            </div>
            
            <div className="service-card">
              <div className="service-icon">⚖️</div>
              <h3>Defesa Estratégica</h3>
              <p>Representação especializada em processos trabalhistas com foco na proteção do patrimônio empresarial e pessoal.</p>
              <a href="#contato" className="service-link">Saiba mais →</a>
            </div>
            
            <div className="service-card">
              <div className="service-icon">📱</div>
              <h3>Portal do Cliente 24/7</h3>
              <p>Acompanhe seus processos online com total transparência. Acesso exclusivo ao andamento dos seus casos, documentos e comunicação direta.</p>
              <a href="/portal" className="service-link">Acessar Portal →</a>
            </div>
            
            <div className="service-card">
              <div className="service-icon">📋</div>
              <h3>Compliance Trabalhista</h3>
              <p>Implementação de sistemas de compliance para garantir conformidade com a legislação e reduzir riscos significativamente.</p>
              <a href="#contato" className="service-link">Saiba mais →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section" id="equipe">
        <div className="container">
          <h2 className="section-title">Expertise Reconhecida</h2>
          <p className="section-subtitle">Nossa equipe combina décadas de experiência com conhecimento especializado em direito empresarial</p>
          
          <div className="team-card">
            <div className="team-photo">
              <div className="team-photo-triangle">
                <span className="team-initials">DR</span>
              </div>
            </div>
            <h3>Dr. D'avila Reis</h3>
            <p className="role">Sócio-Fundador</p>
            <p>Mais de 20 anos de experiência em direito trabalhista empresarial. Especialista em defesa de empresários e blindagem patrimonial.</p>
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section className="careers-section" id="carreiras">
        <div className="container">
          <h2 className="section-title">Faça Parte da Nossa Equipe</h2>
          <p className="section-subtitle">Construa sua carreira em um dos escritórios mais respeitados do direito empresarial</p>
          
          <div className="careers-content">
            <div className="careers-text">
              <h3>Por que trabalhar na D'avila Reis?</h3>
              <div className="benefits-grid">
                <div className="benefit-item">
                  <div className="benefit-icon">🚀</div>
                  <div>
                    <h4>Crescimento Profissional</h4>
                    <p>Ambiente que valoriza o desenvolvimento e oferece oportunidades reais de crescimento</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <div className="benefit-icon">💼</div>
                  <div>
                    <h4>Cases Desafiadores</h4>
                    <p>Trabalhe com empresas de grande porte em casos complexos e estratégicos</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <div className="benefit-icon">🏆</div>
                  <div>
                    <h4>Reconhecimento</h4>
                    <p>Faça parte de uma equipe reconhecida pela excelência e resultados</p>
                  </div>
                </div>
                
                <div className="benefit-item">
                  <div className="benefit-icon">⚖️</div>
                  <div>
                    <h4>Tradição + Inovação</h4>
                    <p>20 anos de mercado combinados com as mais modernas ferramentas jurídicas</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="careers-cta">
              <div className="careers-card">
                <h3>Oportunidades Abertas</h3>
                <p>Temos vagas para profissionais que querem fazer a diferença no direito empresarial e trabalhista.</p>
                
                <div className="open-positions">
                  <div className="position-item">
                    <span className="position-title">Advogado Júnior</span>
                    <span className="position-area">Direito Trabalhista</span>
                  </div>
                  <div className="position-item">
                    <span className="position-title">Estagiário em Direito</span>
                    <span className="position-area">4h/dia - Manhã ou Tarde</span>
                  </div>
                  <div className="position-item">
                    <span className="position-title">Assistente Administrativo</span>
                    <span className="position-area">8h/dia - Presencial</span>
                  </div>
                </div>
                
                <a href="mailto:financeiro@davilareisadvogados.com.br?subject=Interesse em Vaga - Currículo" className="careers-btn">
                  Ver Todas as Vagas →
                </a>
                
                <div className="spontaneous-application">
                  <p>Não encontrou a vaga ideal?</p>
                  <a href="mailto:financeiro@davilareisadvogados.com.br?subject=Candidatura Espontânea - Currículo" className="spontaneous-btn">Cadastre seu Currículo</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact" id="contato">
        <div className="container">
          <h2 className="section-title">Entre em Contato</h2>
          <p className="section-subtitle">Agende sua consultoria gratuita e proteja seu negócio hoje mesmo</p>
          
          <div className="contact-content">
            {/* Contact Info */}
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <h4>Telefone</h4>
                  <p><a href="tel:+551533844013">(15) 3384-4013</a></p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div>
                  <h4>E-mail</h4>
                  <p><a href="mailto:financeiro@davilareisadvogados.com.br">financeiro@davilareisadvogados.com.br</a></p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <h4>Endereço</h4>
                  <p>
                    Av. Dr. Vinício Gagliardi, 675<br />
                    Centro, Cerquilho/SP<br />
                    CEP: 18520-091
                  </p>
                </div>
              </div>
              
              <div className="whatsapp-section">
                <h3>Atendimento Imediato</h3>
                <p>Fale conosco agora mesmo pelo WhatsApp</p>
                <a href="https://wa.me/5515999999999?text=Olá! Gostaria de agendar uma consultoria gratuita." target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
                  💬 Chamar no WhatsApp
                </a>
              </div>
            </div>
            
            {/* Contact Form */}
            <form className="contact-form" id="contactForm">
              <div className="form-group">
                <label htmlFor="name">Nome Completo *</label>
                <input type="text" id="name" name="name" placeholder="Seu nome completo" required />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">E-mail *</label>
                <input type="email" id="email" name="email" placeholder="seu@email.com" required />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Telefone/WhatsApp *</label>
                <input type="tel" id="phone" name="phone" placeholder="(15) 99999-9999" required />
              </div>
              
              <div className="form-group">
                <label htmlFor="company">Empresa (opcional)</label>
                <input type="text" id="company" name="company" placeholder="Nome da sua empresa" />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Como podemos ajudar? *</label>
                <textarea id="message" name="message" rows={4} placeholder="Descreva sua necessidade jurídica, dúvida ou como podemos ajudar sua empresa..." required></textarea>
              </div>
              
              <button type="submit" className="submit-btn">Enviar Mensagem</button>
              
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '1rem' }}>
                <p>🔒 Seus dados estão protegidos pela LGPD.<br />Responderemos em até 24 horas.</p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <div className="footer-logo-symbol">
                <div className="footer-logo-triangle">
                  <span className="footer-logo-dr">DR</span>
                </div>
              </div>
              <div className="footer-logo-text">
                <div className="footer-logo-name">D'avila Reis</div>
                <div className="footer-logo-subtitle">Advogados</div>
              </div>
            </div>
            <p>Protegendo empresários há mais de 20 anos através de estratégias jurídicas preventivas e defesa especializada.</p>
          </div>
          
          <div className="footer-section">
            <h4>Serviços</h4>
            <ul>
              <li><a href="#servicos">Consultoria Preventiva</a></li>
              <li><a href="#servicos">Defesa Trabalhista</a></li>
              <li><a href="#servicos">Compliance Empresarial</a></li>
              <li><a href="/portal">Portal do Cliente</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Recursos</h4>
            <ul>
              <li><a href="#">Blog Jurídico</a></li>
              <li><a href="#">Casos de Sucesso</a></li>
              <li><a href="#">Guias Gratuitos</a></li>
              <li><a href="#carreiras">Trabalhe Conosco</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Contato</h4>
            <ul>
              <li><strong>Telefone:</strong> (15) 3384-4013</li>
              <li><strong>Email:</strong> financeiro@davilareisadvogados.com.br</li>
              <li><strong>Endereço:</strong> Av. Dr. Vinício Gagliardi, 675<br />Centro, Cerquilho/SP</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 D'avila Reis Advogados. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <a href="https://wa.me/5515999999999?text=Olá! Gostaria de falar sobre serviços jurídicos." className="whatsapp-float">
        💬
      </a>
    </>
  );
}