import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  AuthButton,
  AuthCard,
  AuthDivider,
  Checkbox,
  ErrorMessage,
  FormContainer,
  LoadingButton,
  PasswordInput,
  RememberMe,
  SocialButton,
  SuccessMessage,
  TextInput,
} from './components';

export default function AuthFoundationPreview() {
  return (
    <AuthCard className="auth-foundation-card" labelledBy="auth-foundation-heading">
      <div className="auth-foundation-aside">
        <span className="auth-aside-index">DESIGN FOUNDATION / 04.0</span>
        <span className="auth-aside-emblem" aria-hidden="true">
          <Sparkles />
        </span>
        <p className="auth-aside-caption">AL SERA · ACCOUNT EXPERIENCE</p>
        <h1 id="auth-foundation-heading">
          A more considered
          <br />
          <em>way to belong.</em>
        </h1>
        <p className="auth-aside-description">
          A reusable set of authentication building blocks, shaped around the AlSera experience.
        </p>
        <span className="auth-aside-note">
          <span aria-hidden="true" />
          COMPONENT PREVIEW · NO ACCOUNT ACTIONS
        </span>
        <span className="auth-aside-orbit auth-aside-orbit--one" aria-hidden="true" />
        <span className="auth-aside-orbit auth-aside-orbit--two" aria-hidden="true" />
      </div>

      <div className="auth-foundation-content">
        <div className="auth-preview-heading">
          <p>REUSABLE UI KIT</p>
          <h2>Authentication foundation</h2>
          <span>Component states and patterns for future account screens.</span>
        </div>

        <div className="auth-preview-block">
          <FormContainer
            className="auth-preview-form"
            ariaLabel="Authentication component preview"
            onSubmit={(event) => event.preventDefault()}
          >
            <TextInput
              label="Email input"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
              hint="Default · required · keyboard accessible"
            />
            <TextInput label="Text input" placeholder="A reusable text field" />
            <PasswordInput
              label="Password input"
              placeholder="Password visibility toggle"
              autoComplete="off"
              hint="Focus to see the premium field state"
            />
            <TextInput
              label="Search input"
              type="search"
              placeholder="Search account settings"
              autoComplete="off"
            />
            <div className="auth-state-grid">
              <TextInput
                label="Validation success"
                placeholder="Valid state"
                state="success"
                readOnly
                value="Looks good"
              />
              <TextInput
                label="Validation error"
                placeholder="Error state"
                error="This is an example validation message."
                readOnly
                value="Needs attention"
              />
            </div>
            <TextInput label="Disabled input" placeholder="Unavailable state" disabled />
          </FormContainer>
        </div>

        <div className="auth-preview-row">
          <RememberMe defaultChecked />
          <Checkbox label="Optional updates" />
        </div>

        <div className="auth-preview-messages">
          <ErrorMessage title="Error message">
            A reusable, announced validation message.
          </ErrorMessage>
          <SuccessMessage title="Success message">
            A clear confirmation state for future flows.
          </SuccessMessage>
        </div>

        <div className="auth-preview-actions">
          <div className="auth-button-samples">
            <AuthButton variant="primary">Primary</AuthButton>
            <AuthButton variant="secondary">Secondary</AuthButton>
            <AuthButton variant="outline">Outline</AuthButton>
            <AuthButton variant="ghost">Ghost</AuthButton>
          </div>
          <div className="auth-button-samples auth-button-samples--states">
            <LoadingButton isLoading loadingLabel="Please wait">
              Loading
            </LoadingButton>
            <AuthButton variant="outline" disabled>
              Disabled
            </AuthButton>
          </div>
        </div>

        <AuthDivider label="Social button styles · UI only" />
        <div className="auth-social-grid">
          <SocialButton provider="Google" disabled />
          <SocialButton provider="GitHub" disabled />
          <SocialButton provider="Facebook" disabled />
        </div>

        <p className="auth-preview-footnote">
          No login, signup, social authentication, API, or account processing is configured.
          <a href="/" aria-label="Return to homepage">
            Return to AlSera <ArrowUpRight aria-hidden="true" />
          </a>
        </p>
      </div>
    </AuthCard>
  );
}
