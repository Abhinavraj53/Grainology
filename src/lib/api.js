// API Client to replace Supabase - maintains same interface for frontend compatibility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 (Unauthorized) gracefully for session endpoint
      if (response.status === 401 && endpoint === '/auth/session') {
        return { user: null, session: null };
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw error;
      }

      return await response.json();
    } catch (error) {
      // For session endpoint, return null instead of throwing
      if (endpoint === '/auth/session') {
        return { user: null, session: null };
      }
      throw error;
    }
  }

  // Auth methods compatible with Supabase interface
  auth = {
    getSession: async () => {
      try {
        const data = await this.request('/auth/session');

        // Persist access token if the session includes one (supports existing logins)
        if (data?.session?.access_token) {
          this.setToken(data.session.access_token);
        }

        return {
          data: {
            session: data.session,
            user: data.user
          },
          error: null
        };
      } catch (error) {
        return {
          data: { session: null, user: null },
          error
        };
      }
    },

    signUp: async (signUpData) => {
      try {
        const data = await this.request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(signUpData),
        });
        if (data.session?.access_token) {
          this.setToken(data.session.access_token);
        }
        return {
          data: {
            user: data.user,
            session: data.session
          },
          error: null
        };
      } catch (error) {
        return { data: { user: null, session: null }, error };
      }
    },

    signInWithPassword: async ({ email, password }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            data: { user: null, session: null },
            error: data.error || { message: 'Invalid credentials' }
          };
        }

        if (data.session?.access_token) {
          this.setToken(data.session.access_token);
        }
        return {
          data: {
            user: data.user,
            session: data.session
          },
          error: null
        };
      } catch (error) {
        return {
          data: { user: null, session: null },
          error: { message: error.message || 'Failed to sign in' }
        };
      }
    },

    signOut: async () => {
      try {
        await this.request('/auth/signout', { method: 'POST' });
        this.setToken(null);
        return { error: null };
      } catch (error) {
        this.setToken(null);
        return { error };
      }
    },

    getUser: async () => {
      try {
        const data = await this.request('/auth/user');
        return {
          data: { user: data.user },
          error: null
        };
      } catch (error) {
        return { data: { user: null }, error };
      }
    },

    onAuthStateChange: (callback) => {
      // Poll for auth state changes
      let currentUser = null;
      const interval = setInterval(async () => {
        const { data } = await this.auth.getSession();
        if (data.user?.id !== currentUser?.id) {
          currentUser = data.user;
          callback('SIGNED_IN', data.session);
        }
      }, 1000);

      // Initial check
      this.auth.getSession().then(({ data }) => {
        currentUser = data.user;
        callback('INITIAL_SESSION', data.session);
      });

      return {
        data: { subscription: { unsubscribe: () => clearInterval(interval) } }
      };
    }
  };

  // Database methods compatible with Supabase interface
  from(table) {
    const self = this;
    
    // Query builder class for chaining
    class QueryBuilder {
      constructor(table, columns = '*') {
        this.table = table;
        this.columns = columns;
        this.filters = {};
        this.options = {};
      }

      eq(column, value) {
        this.filters[column] = value;
        return this;
      }

      neq(column, value) {
        this.filters[column] = { $ne: value };
        return this;
      }

      in(column, values) {
        this.filters[column] = { $in: values };
        return this;
      }

      gte(column, value) {
        if (this.filters[column] && typeof this.filters[column] === 'object' && !Array.isArray(this.filters[column])) {
          this.filters[column] = { ...this.filters[column], $gte: value };
        } else {
          this.filters[column] = { $gte: value };
        }
        return this;
      }

      lte(column, value) {
        if (this.filters[column] && typeof this.filters[column] === 'object' && !Array.isArray(this.filters[column])) {
          this.filters[column] = { ...this.filters[column], $lte: value };
        } else {
          this.filters[column] = { $lte: value };
        }
        return this;
      }

      gt(column, value) {
        if (this.filters[column] && typeof this.filters[column] === 'object' && !Array.isArray(this.filters[column])) {
          this.filters[column] = { ...this.filters[column], $gt: value };
        } else {
          this.filters[column] = { $gt: value };
        }
        return this;
      }

      lt(column, value) {
        if (this.filters[column] && typeof this.filters[column] === 'object' && !Array.isArray(this.filters[column])) {
          this.filters[column] = { ...this.filters[column], $lt: value };
        } else {
          this.filters[column] = { $lt: value };
        }
        return this;
      }

      or(conditionString) {
        // Parse Supabase-style or condition: "column1.eq.value1,column2.eq.value2"
        // Store as special filter for backend to handle
        this.filters._or = conditionString;
        return this;
      }

      order(column, options = {}) {
        this.options.sort = { [column]: options.ascending ? 1 : -1 };
        return this;
      }

      limit(count) {
        this.options.limit = count;
        return this;
      }

      async maybeSingle() {
        this.options.single = true;
        return self.query(this.table, this.filters, this.columns, this.options);
      }

      async then(resolve, reject) {
        // Make it awaitable - execute query when awaited
        try {
          const result = await self.query(this.table, this.filters, this.columns, this.options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    }

    return {
      select: (columns) => new QueryBuilder(table, columns),
      insert: (data) => this.insert(table, data),
      update: (data) => ({
        eq: (column, value) => this.update(table, { [column]: value }, data)
      }),
      delete: () => ({
        eq: (column, value) => this.delete(table, { [column]: value })
      })
    };
  }

  async query(table, filters = {}, columns = '*', options = {}) {
    try {
      const endpoint = this.getTableEndpoint(table);
      let url = endpoint;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Handle filters - for profiles, we need to filter by id
      if (filters.id && !filters._or) {
        url = `${endpoint}/${filters.id}`;
      } else {
        // For other filters, add as query params
        Object.keys(filters).forEach(key => {
          if (key === '_or') {
            // Handle or condition - send to backend as special parameter
            params.append('or', filters[key]);
          } else if (typeof filters[key] === 'object' && filters[key] !== null) {
            // Handle comparison operators
            if (filters[key].$in) {
              filters[key].$in.forEach((val, idx) => {
                params.append(`${key}[${idx}]`, val);
              });
            } else if (filters[key].$ne !== undefined) {
              params.append(`${key}__ne`, filters[key].$ne);
            } else if (filters[key].$gte !== undefined) {
              params.append(`${key}__gte`, filters[key].$gte);
            } else if (filters[key].$lte !== undefined) {
              params.append(`${key}__lte`, filters[key].$lte);
            } else if (filters[key].$gt !== undefined) {
              params.append(`${key}__gt`, filters[key].$gt);
            } else if (filters[key].$lt !== undefined) {
              params.append(`${key}__lt`, filters[key].$lt);
            } else {
              // For complex objects, stringify
              params.append(key, JSON.stringify(filters[key]));
            }
          } else {
            params.append(key, filters[key]);
          }
        });
      }
      
      if (options.sort) {
        params.append('sort', JSON.stringify(options.sort));
      }
      if (options.limit) {
        params.append('limit', options.limit);
      }

      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }
      
      const data = await this.request(url);

      if (options.single) {
        // For single result, return the first item or null
        if (Array.isArray(data)) {
          return { data: data.length > 0 ? data[0] : null, error: null };
        }
        return { data: data || null, error: null };
      }

      return { data: Array.isArray(data) ? data : [data], error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async insert(table, data) {
    try {
      const endpoint = this.getTableEndpoint(table);
      const result = await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async update(table, filters, data) {
    try {
      // For updates, we need to find the record first, then update
      const endpoint = this.getTableEndpoint(table);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        params.append(key, filters[key]);
      });
      
      // Get the record
      const records = await this.request(`${endpoint}?${params.toString()}`);
      if (!records || records.length === 0) {
        return { data: null, error: { message: 'Record not found' } };
      }

      // Update the record
      const updated = await this.request(`${endpoint}/${records[0].id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return { data: updated, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async delete(table, filters) {
    try {
      const endpoint = this.getTableEndpoint(table);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        params.append(key, filters[key]);
      });
      
      const records = await this.request(`${endpoint}?${params.toString()}`);
      if (!records || records.length === 0) {
        return { data: null, error: { message: 'Record not found' } };
      }

      await this.request(`${endpoint}/${records[0].id}`, {
        method: 'DELETE',
      });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  getTableEndpoint(table) {
    const tableMap = {
      'profiles': '/profiles',
      'offers': '/offers',
      'orders': '/orders',
      'quality_parameters': '/quality',
      'mandi_prices': '/mandi',
      'weather_data': '/weather',
      'logistics_providers': '/logistics',
      'logistics_shipments': '/logistics-shipments',
              'variety_master': '/variety-master',
              'purchase_orders': '/purchase-orders',
              'sale_orders': '/sale-orders',
              'reports': '/reports',
              'supply_transactions': '/supply-transactions'
            };
    return tableMap[table] || `/${table}`;
  }
}

export const api = new ApiClient();

