import React from 'react';
import { 
  Form, 
  FormSection, 
  FormField, 
  FormActions, 
  FormGroup,
  FormErrorSummary 
} from './Form';
import { Input } from './Input';
import { Textarea, Select, Checkbox, RadioGroup } from './FormInputs';
import { Button } from './Button';
import { useFormValidation, fieldConfigs } from '../../hooks/useFormValidation';
import { validateRequired, validateEmail, validateMinLength } from '../../utils/validationUtils';

// Example form data structure
interface ExampleFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  requestType: string;
  description: string;
  urgency: string;
  amount: string;
  agreeToTerms: boolean;
  notifications: boolean;
}

const initialValues: ExampleFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  requestType: '',
  description: '',
  urgency: 'medium',
  amount: '',
  agreeToTerms: false,
  notifications: true,
};

const formConfig = {
  firstName: fieldConfigs.required(true),
  lastName: fieldConfigs.required(true),
  email: fieldConfigs.email(true, true),
  phone: {
    required: false,
    validateOnBlur: true,
  },
  department: fieldConfigs.required(true),
  requestType: fieldConfigs.required(true),
  description: fieldConfigs.minLength(10, true, true),
  urgency: fieldConfigs.required(true),
  amount: fieldConfigs.positiveNumber(true, true),
  agreeToTerms: {
    required: true,
    validators: [
      (value: boolean) => {
        if (!value) {
          return { isValid: false, error: 'You must agree to the terms and conditions' };
        }
        return { isValid: true };
      }
    ],
  },
  notifications: {
    required: false,
  },
};

const departmentOptions = [
  { value: 'it', label: 'Information Technology' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
];

const requestTypeOptions = [
  { value: 'equipment', label: 'Equipment Purchase' },
  { value: 'software', label: 'Software License' },
  { value: 'service', label: 'Service Contract' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'other', label: 'Other' },
];

const urgencyOptions = [
  { 
    value: 'low', 
    label: 'Low Priority', 
    description: 'Can wait 2-4 weeks' 
  },
  { 
    value: 'medium', 
    label: 'Medium Priority', 
    description: 'Needed within 1-2 weeks' 
  },
  { 
    value: 'high', 
    label: 'High Priority', 
    description: 'Urgent - needed within days' 
  },
];

interface ExampleFormProps {
  onSubmit?: (data: ExampleFormData) => Promise<void>;
  className?: string;
}

export const ExampleForm: React.FC<ExampleFormProps> = ({ 
  onSubmit,
  className 
}) => {
  const form = useFormValidation(initialValues, formConfig);

  const handleSubmit = async (values: ExampleFormData) => {
    try {
      console.log('Form submitted:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSubmit) {
        await onSubmit(values);
      }
      
      // Reset form on successful submission
      form.resetForm();
      
      alert('Form submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      form.setError('email', 'Submission failed. Please try again.');
    }
  };

  // Get form errors for error summary
  const formErrors = Object.entries(form.errors)
    .filter(([_, error]) => error)
    .map(([field, error]) => `${field}: ${error}`);

  return (
    <Form
      title="Procurement Request Form"
      description="Please fill out all required fields to submit your procurement request."
      spacing="content"
      className={className}
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      {/* Error Summary */}
      {formErrors.length > 0 && (
        <FormErrorSummary 
          errors={formErrors}
          title="Please correct the following errors:"
        />
      )}

      {/* Personal Information Section */}
      <FormSection 
        title="Personal Information"
        description="Basic information about the requester"
      >
        <FormGroup>
          <FormField 
            label="First Name" 
            error={form.getFieldProps('firstName').error}
            isRequired
          >
            <Input
              placeholder="Enter your first name"
              {...form.getFieldProps('firstName')}
            />
          </FormField>
          
          <FormField 
            label="Last Name" 
            error={form.getFieldProps('lastName').error}
            isRequired
          >
            <Input
              placeholder="Enter your last name"
              {...form.getFieldProps('lastName')}
            />
          </FormField>
        </FormGroup>

        <FormGroup>
          <FormField 
            label="Email Address" 
            error={form.getFieldProps('email').error}
            isRequired
            helpText="We'll use this to send updates about your request"
          >
            <Input
              type="email"
              placeholder="Enter your email address"
              {...form.getFieldProps('email')}
            />
          </FormField>
          
          <FormField 
            label="Phone Number" 
            error={form.getFieldProps('phone').error}
            helpText="Optional - for urgent communications"
          >
            <Input
              type="tel"
              placeholder="Enter your phone number"
              {...form.getFieldProps('phone')}
            />
          </FormField>
        </FormGroup>

        <FormField 
          label="Department" 
          error={form.getFieldProps('department').error}
          isRequired
        >
          <Select
            placeholder="Select your department"
            options={departmentOptions}
            {...form.getFieldProps('department')}
          />
        </FormField>
      </FormSection>

      {/* Request Details Section */}
      <FormSection 
        title="Request Details"
        description="Information about what you're requesting"
      >
        <FormField 
          label="Request Type" 
          error={form.getFieldProps('requestType').error}
          isRequired
        >
          <Select
            placeholder="Select request type"
            options={requestTypeOptions}
            {...form.getFieldProps('requestType')}
          />
        </FormField>

        <FormField 
          label="Description" 
          error={form.getFieldProps('description').error}
          isRequired
          helpText="Please provide a detailed description (minimum 10 characters)"
        >
          <Textarea
            placeholder="Describe what you need and why..."
            rows={4}
            {...form.getFieldProps('description')}
          />
        </FormField>

        <FormGroup>
          <FormField 
            label="Estimated Amount" 
            error={form.getFieldProps('amount').error}
            isRequired
            helpText="Enter amount in USD"
          >
            <Input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              {...form.getFieldProps('amount')}
            />
          </FormField>
        </FormGroup>

        <FormField 
          label="Priority Level"
          error={form.getFieldProps('urgency').error}
          isRequired
        >
          <RadioGroup
            name="urgency"
            options={urgencyOptions}
            value={form.values.urgency}
            onChange={(value) => form.setValue('urgency', value)}
          />
        </FormField>
      </FormSection>

      {/* Agreement Section */}
      <FormSection title="Agreement">
        <FormField error={form.getFieldProps('agreeToTerms').error}>
          <Checkbox
            label="I agree to the terms and conditions"
            description="By checking this box, you agree to our procurement policies and procedures."
            checked={form.values.agreeToTerms}
            onChange={(e) => form.setValue('agreeToTerms', e.target.checked)}
          />
        </FormField>

        <FormField>
          <Checkbox
            label="Send me email notifications"
            description="Receive updates about your request status via email."
            checked={form.values.notifications}
            onChange={(e) => form.setValue('notifications', e.target.checked)}
          />
        </FormField>
      </FormSection>

      {/* Form Actions */}
      <FormActions align="right">
        <Button 
          type="button" 
          variant="secondary"
          onClick={() => form.resetForm()}
          disabled={form.isSubmitting}
        >
          Reset Form
        </Button>
        <Button 
          type="submit"
          variant="primary"
          isLoading={form.isSubmitting}
          loadingText="Submitting..."
          disabled={!form.isValid && Object.keys(form.touched).length > 0}
        >
          Submit Request
        </Button>
      </FormActions>
    </Form>
  );
};