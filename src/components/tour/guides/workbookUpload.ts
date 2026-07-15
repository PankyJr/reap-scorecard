import type { Guide } from './types'

export const workbookUploadGuide: Guide = {
  id: 'workbook-upload',
  title: 'Supplier workbook import',
  description: 'Import supplier rows from Excel during a procurement assessment.',
  estimatedMinutes: 2,
  routePrefixes: ['/procurement/assessments/new'],
  steps: [
    {
      id: 'upload-intro',
      phase: 'Upload',
      title: 'Supplier workbook import',
      body: 'On a new procurement assessment, scroll to the Excel import section to upload a supplier register workbook. The system detects columns and loads rows into the assessment.',
      placement: 'center',
      mode: 'info',
      requiredPath: '/procurement/assessments/new',
    },
    {
      id: 'upload-dropzone',
      phase: 'Upload',
      title: 'Choose your workbook',
      body: 'Drop a .xlsx or .xls file or click to browse. Supported files include a supplier register tab with spend and B-BBEE level columns.',
      hint: 'Click the upload area to open the file picker.',
      target: 'upload',
      placement: 'top',
      mode: 'info',
      requiredPath: '/procurement/assessments/new',
    },
    {
      id: 'upload-preview',
      phase: 'Preview',
      title: 'Review mappings and validation',
      body: 'Confirm column mappings, resolve any validation messages, then apply suppliers to the assessment. TMPS inputs above are still required before saving.',
      target: 'upload',
      placement: 'top',
      mode: 'info',
      requiredPath: '/procurement/assessments/new',
    },
    {
      id: 'finish',
      phase: 'Complete',
      title: 'Import guide complete',
      body: 'You know how to import supplier workbooks. Save the assessment when TMPS and supplier rows are complete.',
      placement: 'center',
      mode: 'info',
    },
  ],
}
