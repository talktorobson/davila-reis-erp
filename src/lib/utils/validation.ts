// D'Avila Reis ERP - Validation Utilities

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export class ValidationUtils {
  
  /**
   * Validate Brazilian email format
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = []
    
    if (!email || typeof email !== 'string') {
      errors.push('Email é obrigatório')
      return { isValid: false, errors }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      errors.push('Email deve ter um formato válido')
    }
    
    // Check for common typos
    const commonDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'uol.com.br']
    const domain = email.split('@')[1]?.toLowerCase()
    
    if (domain) {
      // Check for similar domains (typos)
      const similarDomain = commonDomains.find(d => 
        this.levenshteinDistance(domain, d) === 1 && domain !== d
      )
      
      if (similarDomain) {
        errors.push(`Você quis dizer ${email.split('@')[0]}@${similarDomain}?`)
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }

  /**
   * Validate Brazilian phone numbers
   */
  static validateBrazilianPhone(phone: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!phone || typeof phone !== 'string') {
      errors.push('Telefone é obrigatório')
      return { isValid: false, errors }
    }
    
    // Remove formatting
    const cleanPhone = phone.replace(/\D/g, '')
    
    if (cleanPhone.length < 10) {
      errors.push('Telefone deve ter pelo menos 10 dígitos')
    } else if (cleanPhone.length > 13) {
      errors.push('Telefone não pode ter mais de 13 dígitos')
    }
    
    // Check for valid Brazilian phone patterns
    const patterns = [
      /^55[1-9]{2}[2-9]\d{8}$/, // +55 XX 9XXXX-XXXX (mobile with country code)
      /^[1-9]{2}9\d{8}$/, // XX 9XXXX-XXXX (mobile)
      /^[1-9]{2}[2-5]\d{7}$/, // XX XXXX-XXXX (landline)
      /^55[1-9]{2}[2-5]\d{7}$/, // +55 XX XXXX-XXXX (landline with country code)
    ]
    
    const isValidPattern = patterns.some(pattern => pattern.test(cleanPhone))
    
    if (!isValidPattern && cleanPhone.length >= 10) {
      errors.push('Formato de telefone inválido para números brasileiros')
    }
    
    // Check area code validity
    if (cleanPhone.length >= 10) {
      const areaCode = cleanPhone.startsWith('55') 
        ? cleanPhone.substring(2, 4) 
        : cleanPhone.substring(0, 2)
      
      const validAreaCodes = [
        '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
        '21', '22', '24', // RJ
        '27', '28', // ES
        '31', '32', '33', '34', '35', '37', '38', // MG
        '41', '42', '43', '44', '45', '46', // PR
        '47', '48', '49', // SC
        '51', '53', '54', '55', // RS
        '61', // DF
        '62', '64', // GO
        '63', // TO
        '65', '66', // MT
        '67', // MS
        '68', // AC
        '69', // RO
        '71', '73', '74', '75', '77', // BA
        '79', // SE
        '81', '87', // PE
        '82', // AL
        '83', // PB
        '84', // RN
        '85', '88', // CE
        '86', '89', // PI
        '91', '93', '94', // PA
        '92', '97', // AM
        '95', // RR
        '96', // AP
        '98', '99', // MA
      ]
      
      if (!validAreaCodes.includes(areaCode)) {
        warnings.push('Código de área não reconhecido')
      }
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings: warnings.length > 0 ? warnings : undefined 
    }
  }

  /**
   * Validate Brazilian CNPJ
   */
  static validateCNPJ(cnpj: string): ValidationResult {
    const errors: string[] = []
    
    if (!cnpj) {
      return { isValid: true, errors } // CNPJ is optional
    }
    
    // Remove formatting
    const cleanCNPJ = cnpj.replace(/\D/g, '')
    
    if (cleanCNPJ.length !== 14) {
      errors.push('CNPJ deve ter 14 dígitos')
      return { isValid: false, errors }
    }
    
    // Check for invalid patterns (all same digits)
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      errors.push('CNPJ inválido')
      return { isValid: false, errors }
    }
    
    // Validate CNPJ algorithm
    const digits = cleanCNPJ.split('').map(Number)
    
    // First check digit
    let sum = 0
    let weight = 5
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    
    const firstCheckDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    
    if (firstCheckDigit !== digits[12]) {
      errors.push('CNPJ inválido - primeiro dígito verificador')
      return { isValid: false, errors }
    }
    
    // Second check digit
    sum = 0
    weight = 6
    for (let i = 0; i < 13; i++) {
      sum += digits[i] * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    
    const secondCheckDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    
    if (secondCheckDigit !== digits[13]) {
      errors.push('CNPJ inválido - segundo dígito verificador')
      return { isValid: false, errors }
    }
    
    return { isValid: true, errors }
  }

  /**
   * Validate person name
   */
  static validateName(name: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!name || typeof name !== 'string') {
      errors.push('Nome é obrigatório')
      return { isValid: false, errors }
    }
    
    const trimmedName = name.trim()
    
    if (trimmedName.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres')
    }
    
    if (trimmedName.length > 255) {
      errors.push('Nome deve ter no máximo 255 caracteres')
    }
    
    // Check for numbers in name
    if (/\d/.test(trimmedName)) {
      warnings.push('Nome contém números - verifique se está correto')
    }
    
    // Check for special characters (except common ones)
    if (/[^a-zA-ZÀ-ÿ\s\-\']/.test(trimmedName)) {
      warnings.push('Nome contém caracteres especiais')
    }
    
    // Check if it's a single word (might need surname)
    if (!trimmedName.includes(' ')) {
      warnings.push('Nome parece incompleto - considere incluir sobrenome')
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings: warnings.length > 0 ? warnings : undefined 
    }
  }

  /**
   * Validate company name
   */
  static validateCompanyName(companyName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!companyName) {
      return { isValid: true, errors } // Company is optional
    }
    
    const trimmedName = companyName.trim()
    
    if (trimmedName.length < 2) {
      errors.push('Nome da empresa deve ter pelo menos 2 caracteres')
    }
    
    if (trimmedName.length > 255) {
      errors.push('Nome da empresa deve ter no máximo 255 caracteres')
    }
    
    // Check for common business suffixes
    const businessSuffixes = ['ltda', 'eireli', 'me', 'epp', 'sa', 's.a.', 's/a']
    const hasBusinessSuffix = businessSuffixes.some(suffix => 
      trimmedName.toLowerCase().includes(suffix)
    )
    
    if (!hasBusinessSuffix) {
      warnings.push('Nome da empresa pode precisar de sufixo legal (LTDA, EIRELI, etc.)')
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings: warnings.length > 0 ? warnings : undefined 
    }
  }

  /**
   * Validate message content
   */
  static validateMessage(message: string, minLength: number = 10): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!message || typeof message !== 'string') {
      errors.push('Mensagem é obrigatória')
      return { isValid: false, errors }
    }
    
    const trimmedMessage = message.trim()
    
    if (trimmedMessage.length < minLength) {
      errors.push(`Mensagem deve ter pelo menos ${minLength} caracteres`)
    }
    
    if (trimmedMessage.length > 2000) {
      errors.push('Mensagem deve ter no máximo 2000 caracteres')
    }
    
    // Check for spam indicators
    const spamIndicators = [
      /(.)\1{10,}/, // Repeated characters
      /[A-Z]{20,}/, // Too many capitals
      /[!]{3,}/, // Too many exclamations
      /\$\$\$|\$\d+/, // Money symbols
      /bitcoin|crypto|investimento garantido/i, // Common spam words
    ]
    
    const hasSpamIndicators = spamIndicators.some(pattern => pattern.test(trimmedMessage))
    
    if (hasSpamIndicators) {
      warnings.push('Mensagem pode ser considerada spam pelo sistema')
    }
    
    // Check if message is too generic
    const genericPhrases = [
      'oi', 'olá', 'quero informações', 'me ajude', 'preciso de ajuda'
    ]
    
    const isGeneric = genericPhrases.some(phrase => 
      trimmedMessage.toLowerCase() === phrase
    )
    
    if (isGeneric) {
      warnings.push('Mensagem muito genérica - detalhes específicos ajudam no atendimento')
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings: warnings.length > 0 ? warnings : undefined 
    }
  }

  /**
   * Comprehensive form validation
   */
  static validateContactForm(data: {
    name: string
    email: string
    phone: string
    company?: string
    message: string
  }): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []
    
    // Validate each field
    const nameResult = this.validateName(data.name)
    const emailResult = this.validateEmail(data.email)
    const phoneResult = this.validateBrazilianPhone(data.phone)
    const companyResult = this.validateCompanyName(data.company || '')
    const messageResult = this.validateMessage(data.message)
    
    // Collect all errors
    allErrors.push(...nameResult.errors)
    allErrors.push(...emailResult.errors)
    allErrors.push(...phoneResult.errors)
    allErrors.push(...companyResult.errors)
    allErrors.push(...messageResult.errors)
    
    // Collect all warnings
    if (nameResult.warnings) allWarnings.push(...nameResult.warnings)
    if (emailResult.warnings) allWarnings.push(...emailResult.warnings)
    if (phoneResult.warnings) allWarnings.push(...phoneResult.warnings)
    if (companyResult.warnings) allWarnings.push(...companyResult.warnings)
    if (messageResult.warnings) allWarnings.push(...messageResult.warnings)
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    }
  }

  /**
   * Calculate Levenshtein distance (for typo detection)
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .trim()
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 500) // Limit length
  }

  /**
   * Format phone number for display
   */
  static formatBrazilianPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '')
    
    if (clean.length === 11) {
      // Mobile: (XX) 9XXXX-XXXX
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`
    } else if (clean.length === 10) {
      // Landline: (XX) XXXX-XXXX
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`
    } else if (clean.length === 13 && clean.startsWith('55')) {
      // With country code: +55 (XX) 9XXXX-XXXX
      return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`
    }
    
    return phone // Return original if can't format
  }

  /**
   * Format CNPJ for display
   */
  static formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '')
    
    if (clean.length === 14) {
      return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`
    }
    
    return cnpj
  }
}