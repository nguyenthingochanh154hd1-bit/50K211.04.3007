/* Điểm vào của ứng dụng Cherry Laundry (Vite). */
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/forms.css';
import './styles/responsive.css';

/* Khai báo tài nguyên đồng bộ của từng module */
import './modules/orders/orders.service.js';
import './modules/customers/customers.service.js';
import './modules/services/services.service.js';
import './modules/payments/payments.service.js';
import './modules/expenses/expenses.service.js';
import './modules/debts/debts.service.js';

import { initLayout } from './core/app.js';
import './core/events.js';
import './core/router.js';
import { API } from './services/api.js';

initLayout();
API.boot();
