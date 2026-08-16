import { CreateForm } from '@ilokesto/form';
import { createApp } from 'vue';
import App from './App.vue';

type LoginValues = {
  email: string;
  password: string;
};

const emailSchema = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(value: unknown) {
      if (typeof value !== 'string' || value.trim() === '') {
        return { issues: [{ message: 'Email is required', path: [] }] };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { issues: [{ message: 'Enter a valid email address', path: [] }] };
      }
      return { value };
    },
  },
};

const passwordSchema = {
  '~standard': {
    version: 1,
    vendor: 'example',
    validate(value: unknown) {
      if (typeof value !== 'string' || value.length === 0) {
        return { issues: [{ message: 'Password is required', path: [] }] };
      }
      if (value.length < 6) {
        return { issues: [{ message: 'Password must be at least 6 characters', path: [] }] };
      }
      return { value };
    },
  },
};

const form = new CreateForm<LoginValues>({
  defaultValues: { email: '', password: '' },
  validateOn: ['blur', 'submit'],
});

export { form, emailSchema, passwordSchema };

createApp(App).mount('#app');