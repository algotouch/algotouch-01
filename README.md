# AlgoTouch

A modern trading platform built with React, TypeScript, and Supabase.

## Features

- Real-time stock data monitoring
- Advanced trading tools
- User authentication and authorization
- Secure payment processing
- Responsive design
- RTL support

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/your-username/algotouch.git
cd algotouch
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

## Development

- `npm run dev` - Start development server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run format` - Format code with Prettier

## Production Deployment

1. Build the application:
```bash
npm run build:prod
```

2. Preview the production build:
```bash
npm run preview
```

3. Deploy to your hosting provider:
```bash
# Example for Vercel
vercel --prod

# Example for Netlify
netlify deploy --prod
```

## Environment Variables

Required environment variables:

- `VITE_APP_ENV` - Application environment (development/production)
- `VITE_API_URL` - API base URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_CARDCOM_TERMINAL` - Cardcom terminal number
- `VITE_CARDCOM_USERNAME` - Cardcom username
- `VITE_CARDCOM_PASSWORD` - Cardcom password
- `VITE_CARDCOM_API_URL` - Cardcom API URL

## Performance Optimization

The application includes several performance optimizations:

- Code splitting
- Lazy loading
- Tree shaking
- Bundle analysis
- Image optimization
- Caching strategies

## Security

- HTTPS enforcement
- CSP headers
- XSS protection
- CSRF protection
- Rate limiting
- Input validation
- Secure authentication

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@algotouch.com or join our Slack channel.
