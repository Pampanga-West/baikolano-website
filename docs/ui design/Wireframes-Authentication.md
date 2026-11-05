# Hope ERP Authentication & Recovery Wireframes

## Task information                                                            
| Item | Details | 
| ----- | ----- | 
| **Task ID** | S1-UIX-02 | 
| **Task name** | Wireframes: Login, Register, Set/Reset Password | 
| **Role** | UI/UX Designer | 
| **Assignee** | Phil Emmanuel Hitalia | 

 ## UX Strategy & User Flow Context

These wireframes define the "gatekeeper" experience for the Hope ERP system. Rather than routing users through multiple disparate pages, the authentication flow utilizes a persistent, centered modal architecture. This reduces cognitive load, keeps the branding visible in the background, and creates a seamless transition from the public landing page to the secure dashboard. The designs prioritize defensive UX: clear error prevention, immediate feedback, and transparent role expectations (e.g., notifying new registrants of their default "User" status).

## 1. Sign In Screen

![alt text](<wireframe 1.png>)

### Layout and components
* **Header:** Features a small "ACCOUNT ACCESS" overline paired with a top-right close (X) icon to dismiss the modal.
* **Form Controls:** Uses standard stacked inputs for Email and Password; the Password field integrates an inline "Show" text toggle for visibility.
* **Utilities:** Places a "Remember me" checkbox floated left, horizontally aligned with the "Forgot password" recovery link floated right.
* **Actions:** Prioritizes a full-width primary "Sign In" button, separated by an "or" divider from the secondary "Continue with Google" social login button.

## 2. Registration Screen

![alt text](<wireframe 2.png>)

### Layout and components
* **Notice Text:** Inserts explicit onboarding expectations directly below the subtitle, clarifying that new accounts default to the User role pending administrator approval.
* **Name Fields:** Arranges the First Name and Last Name input fields side-by-side to optimize vertical space within the card.
* **Footer Links:** Anchors the bottom of the card with an "Already have an account? Sign in" text link to redirect existing users.

## 3. Forgot Password Screen

![alt text](<wireframe 3.png>)

### Layout and components
* **Focus:** Strips away secondary social actions to focus entirely on the single email input required to trigger the account recovery flow.
* **Actions:** Features a primary "Send Reset Link" button and a centered "Back to sign in" text link to return to the main authentication flow if the user remembers their credentials.

## 4. Check Your Email Screen

![alt text](<wireframe 4.png>)

### Layout and components
* **Feedback State:** Acts as an intermediate confirmation screen. It deliberately obscures whether the email exists in the database for security reasons ("If an account exists...").
* **Information Display:** Displays the submitted email address as read-only text under the "EMAIL ENTERED" label to reassure the user.
* **Actions:** Replaces the primary solid button with a secondary, outlined "Back to sign in" button. Includes a subtle inline text link to "Resend link".

## 5. Set Your New Password Screen

![alt text](<wireframe 5.png>)

### Layout and components
* **Form Controls:** Stacks two identical password input fields ("New Password" and "Confirm Password"), both featuring the inline "Show" text toggle.
* **Helper Text:** Injects muted instructional copy directly between the password fields to guide password creation requirements before the user clicks save.
* **Actions:** Restores the primary solid button styling for the core "Save Password" action, ensuring the user completes the flow.

---
