// Improved error handling for register-form.tsx
// Copy this entire catch block to replace the existing one (lines ~156-202)

    } catch (error: any) {
      // Determine locale (simple heuristic: first URL segment or fallback 'en')
      let locale: Locale = 'en'
      if (typeof window !== 'undefined') {
        const seg = window.location.pathname.split('/').filter(Boolean)[0]
        if (seg && ['en','nl','fr'].includes(seg)) locale = seg as Locale
      }

      // Comprehensive localized error messages
      const errorMessages = {
        userExists: {
          en: 'This email is already registered. Please sign in instead.',
          nl: 'Dit e-mailadres is al geregistreerd. Log in met je bestaande account.',
          fr: 'Cet e-mail est déjà enregistré. Veuillez vous connecter.',
        }[locale],
        databaseError: {
          en: 'Unable to create account due to a server error. Please try again.',
          nl: 'Account kon niet worden aangemaakt door een serverfout. Probeer opnieuw.',
          fr: 'Impossible de créer le compte en raison d\'une erreur serveur. Réessayez.',
        }[locale],
        invalidEmail: {
          en: 'Invalid email format. Please enter a valid email address.',
          nl: 'Ongeldig e-mailadres formaat. Voer een geldig e-mailadres in.',
          fr: 'Format de courriel invalide. Veuillez saisir une adresse e-mail valide.',
        }[locale],
        weakPassword: {
          en: 'Password is too weak. Use at least 6 characters.',
          nl: 'Wachtwoord is te zwak. Gebruik minstens 6 tekens.',
          fr: 'Mot de passe trop faible. Utilisez au moins 6 caractères.',
        }[locale],
        rateLimited: {
          en: 'Too many attempts. Please wait a few minutes before trying again.',
          nl: 'Te veel pogingen. Wacht een paar minuten voordat je opnieuw probeert.',
          fr: 'Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.',
        }[locale],
        generic: {
          en: 'Registration failed. Please try again or contact support.',
          nl: 'Registratie mislukt. Probeer opnieuw of neem contact op met support.',
          fr: 'Échec de l\'inscription. Réessayez ou contactez le support.',
        }[locale],
      }

      let rawMsg = error?.message || ''
      let msg = errorMessages.generic

      // Map specific error messages with comprehensive patterns
      if (/user already registered|email already exists|already been registered|User already registered/i.test(rawMsg)) {
        msg = errorMessages.userExists
      } else if (/Database error saving new user/i.test(rawMsg)) {
        msg = errorMessages.databaseError
      } else if (/invalid email|email.*invalid/i.test(rawMsg)) {
        msg = errorMessages.invalidEmail
      } else if (/password.*weak|weak.*password|password.*short/i.test(rawMsg)) {
        msg = errorMessages.weakPassword
      } else if (/rate limit|too many requests|try again later/i.test(rawMsg)) {
        msg = errorMessages.rateLimited
      }

      setError(msg)
      if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.error('[RegisterForm] signUp error:', error)
      }
    } finally {
      setLoading(false)
    }
