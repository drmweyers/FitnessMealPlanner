# Terraform Variables for FitnessMealPlanner Redis Infrastructure

variable "digitalocean_token" {
  description = "DigitalOcean API token for authentication"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.digitalocean_token) > 0
    error_message = "DigitalOcean token must not be empty."
  }
}

variable "project_name" {
  description = "Name of the project - used for naming resources"
  type        = string
  default     = "fitnessmealplanner"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.project_name))
    error_message = "Project name must start with a letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "region" {
  description = "DigitalOcean region for resource deployment"
  type        = string
  default     = "tor1"
  validation {
    condition = contains([
      "nyc1", "nyc2", "nyc3", "ams2", "ams3", "sfo1", "sfo2", "sfo3",
      "sgp1", "lon1", "fra1", "tor1", "blr1", "syd1"
    ], var.region)
    error_message = "Region must be a valid DigitalOcean region."
  }
}

# Redis Configuration Variables
variable "redis_cluster_size" {
  description = "Redis database cluster node size"
  type        = string
  default     = "db-s-1vcpu-1gb"
  validation {
    condition = contains([
      "db-s-1vcpu-1gb", "db-s-1vcpu-2gb", "db-s-2vcpu-4gb", "db-s-4vcpu-8gb"
    ], var.redis_cluster_size)
    error_message = "Redis cluster size must be a valid DigitalOcean database node size."
  }
}

variable "redis_version" {
  description = "Redis version to deploy"
  type        = string
  default     = "7"
  validation {
    condition     = contains(["6", "7"], var.redis_version)
    error_message = "Redis version must be either 6 or 7."
  }
}

variable "redis_node_count" {
  description = "Number of Redis nodes in the cluster"
  type        = number
  default     = 1
  validation {
    condition     = var.redis_node_count >= 1 && var.redis_node_count <= 3
    error_message = "Redis node count must be between 1 and 3."
  }
}

variable "redis_maxmemory_policy" {
  description = "Redis memory eviction policy"
  type        = string
  default     = "allkeys-lru"
  validation {
    condition = contains([
      "allkeys-lru", "allkeys-lfu", "volatile-lru", "volatile-lfu",
      "allkeys-random", "volatile-random", "volatile-ttl", "noeviction"
    ], var.redis_maxmemory_policy)
    error_message = "Invalid Redis maxmemory policy."
  }
}

variable "redis_persistence" {
  description = "Redis persistence strategy"
  type        = string
  default     = "rdb"
  validation {
    condition     = contains(["rdb", "aof", "off"], var.redis_persistence)
    error_message = "Redis persistence must be one of: rdb, aof, off."
  }
}

variable "redis_ssl_enabled" {
  description = "Enable SSL/TLS for Redis connections"
  type        = bool
  default     = true
}

# PostgreSQL Configuration Variables
variable "postgres_cluster_size" {
  description = "PostgreSQL database cluster node size"
  type        = string
  default     = "db-s-1vcpu-1gb"
  validation {
    condition = contains([
      "db-s-1vcpu-1gb", "db-s-1vcpu-2gb", "db-s-2vcpu-4gb", "db-s-4vcpu-8gb"
    ], var.postgres_cluster_size)
    error_message = "PostgreSQL cluster size must be a valid DigitalOcean database node size."
  }
}

variable "postgres_version" {
  description = "PostgreSQL version to deploy"
  type        = string
  default     = "16"
  validation {
    condition     = contains(["14", "15", "16"], var.postgres_version)
    error_message = "PostgreSQL version must be 14, 15, or 16."
  }
}

# Application Configuration Variables
variable "app_instance_size" {
  description = "Application instance size slug"
  type        = string
  default     = "basic-xxs"
  validation {
    condition = contains([
      "basic-xxs", "basic-xs", "basic-s", "basic-m",
      "professional-xs", "professional-s", "professional-m"
    ], var.app_instance_size)
    error_message = "App instance size must be a valid DigitalOcean App Platform size."
  }
}

variable "app_instance_count" {
  description = "Number of application instances"
  type        = number
  default     = 1
  validation {
    condition     = var.app_instance_count >= 1 && var.app_instance_count <= 5
    error_message = "App instance count must be between 1 and 5."
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "evofitmeals.com"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid fully qualified domain name."
  }
}

# Monitoring and Alerting Variables
variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = "admin@evofitmeals.com"
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.alert_email))
    error_message = "Alert email must be a valid email address."
  }
}

variable "cpu_alert_threshold" {
  description = "CPU utilization threshold for alerts (percentage)"
  type        = number
  default     = 80
  validation {
    condition     = var.cpu_alert_threshold >= 50 && var.cpu_alert_threshold <= 95
    error_message = "CPU alert threshold must be between 50 and 95."
  }
}

variable "memory_alert_threshold" {
  description = "Memory utilization threshold for alerts (percentage)"
  type        = number
  default     = 85
  validation {
    condition     = var.memory_alert_threshold >= 60 && var.memory_alert_threshold <= 95
    error_message = "Memory alert threshold must be between 60 and 95."
  }
}

# Backup Configuration Variables
variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 30
    error_message = "Backup retention days must be between 1 and 30."
  }
}

variable "maintenance_day" {
  description = "Day of the week for maintenance windows"
  type        = string
  default     = "sunday"
  validation {
    condition = contains([
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ], var.maintenance_day)
    error_message = "Maintenance day must be a valid day of the week."
  }
}

variable "maintenance_hour" {
  description = "Hour of the day for maintenance windows (24-hour format)"
  type        = string
  default     = "02:00"
  validation {
    condition     = can(regex("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", var.maintenance_hour))
    error_message = "Maintenance hour must be in HH:MM format (24-hour)."
  }
}

# Security Configuration Variables
variable "vpc_ip_range" {
  description = "IP range for the VPC"
  type        = string
  default     = "10.10.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_ip_range, 0))
    error_message = "VPC IP range must be a valid CIDR block."
  }
}

variable "enable_firewall" {
  description = "Enable firewall for enhanced security"
  type        = bool
  default     = true
}

# Container Registry Variables
variable "registry_subscription_tier" {
  description = "Container registry subscription tier"
  type        = string
  default     = "basic"
  validation {
    condition     = contains(["starter", "basic", "professional"], var.registry_subscription_tier)
    error_message = "Registry subscription tier must be starter, basic, or professional."
  }
}

# Application Environment Variables
variable "node_env" {
  description = "Node.js environment"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["development", "staging", "production"], var.node_env)
    error_message = "Node environment must be development, staging, or production."
  }
}

variable "session_store_type" {
  description = "Session store type"
  type        = string
  default     = "redis"
  validation {
    condition     = contains(["redis", "memory", "database"], var.session_store_type)
    error_message = "Session store type must be redis, memory, or database."
  }
}

variable "cache_enabled" {
  description = "Enable application caching"
  type        = bool
  default     = true
}

variable "redis_sentinel_enabled" {
  description = "Enable Redis Sentinel for high availability"
  type        = bool
  default     = false
}

# Resource Tagging Variables
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    "managed-by" = "terraform"
    "project"    = "fitnessmealplanner"
  }
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}