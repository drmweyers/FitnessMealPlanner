# Terraform Configuration for FitnessMealPlanner Redis Infrastructure
# DigitalOcean Provider for Production Redis Deployment

terraform {
  required_version = ">= 1.5"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  
  backend "s3" {
    endpoint                    = "https://tor1.digitaloceanspaces.com"
    bucket                      = "healthtech"
    key                         = "terraform/redis-infrastructure.tfstate"
    region                      = "us-east-1" # Required by AWS provider, but ignored by DO Spaces
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style           = true
  }
}

# DigitalOcean provider configuration
provider "digitalocean" {
  token = var.digitalocean_token
}

# Variables
variable "digitalocean_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "fitnessmealplanner"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "tor1"
}

variable "redis_cluster_size" {
  description = "Redis cluster node size"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "postgres_cluster_size" {
  description = "PostgreSQL cluster node size"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "app_instance_size" {
  description = "Application instance size"
  type        = string
  default     = "basic-xxs"
}

# Data sources
data "digitalocean_project" "main" {
  name = var.project_name
}

# Redis Database Cluster
resource "digitalocean_database_cluster" "redis" {
  name       = "${var.project_name}-redis-${var.environment}"
  engine     = "redis"
  version    = "7"
  size       = var.redis_cluster_size
  region     = var.region
  node_count = 1
  
  # Redis-specific configuration
  redis_config {
    redis_maxmemory_policy = "allkeys-lru"
    redis_pubsub_client_output_buffer_limit = "32mb 8mb 60"
    redis_number_of_databases = 16
    redis_io_threads = 1
    redis_lfu_log_factor = 10
    redis_lfu_decay_time = 1
    redis_ssl = true
    redis_timeout = 300
    redis_notify_keyspace_events = "Ex"
    redis_persistence = "rdb"
    redis_acl_channels_default = "allchannels"
  }
  
  # Maintenance window
  maintenance_window {
    day  = "sunday"
    hour = "02:00"
  }
  
  # Backup configuration
  backup_restore {
    backup_hour   = 3
    backup_minute = 0
  }
  
  tags = [
    "environment:${var.environment}",
    "service:redis",
    "project:${var.project_name}",
    "terraform:managed"
  ]
}

# Redis Database User
resource "digitalocean_database_user" "redis_app_user" {
  cluster_id = digitalocean_database_cluster.redis.id
  name       = "${var.project_name}-app"
}

# PostgreSQL Database Cluster (existing - import)
resource "digitalocean_database_cluster" "postgres" {
  name       = "${var.project_name}-db"
  engine     = "pg"
  version    = "16"
  size       = var.postgres_cluster_size
  region     = var.region
  node_count = 1
  
  # PostgreSQL configuration
  postgres_config {
    autovacuum_freeze_max_age = "200000000"
    autovacuum_max_workers = "3"
    autovacuum_naptime = "60"
    backup_hour = "3"
    backup_minute = "0"
    bgwriter_delay = "200ms"
    bgwriter_flush_after = "512kB"
    bgwriter_lru_maxpages = "100"
    bgwriter_lru_multiplier = "2.0"
    deadlock_timeout = "1s"
    default_toast_compression = "lz4"
    idle_in_transaction_session_timeout = "0"
    jit = true
    log_autovacuum_min_duration = "-1"
    log_error_verbosity = "default"
    log_line_prefix = "%m [%p] %q[%u]@[%d] "
    log_min_duration_statement = "-1"
    max_prepared_transactions = "0"
    max_connections = "22"
    shared_preload_libraries = "pg_stat_statements"
    synchronous_commit = "on"
    temp_file_limit = "-1"
    timezone = "UTC"
    track_activity_query_size = "1024"
    track_commit_timestamp = "off"
    track_functions = "none"
    track_io_timing = "off"
    wal_sender_timeout = "60s"
    wal_writer_delay = "200ms"
    wal_writer_flush_after = "1MB"
  }
  
  # Maintenance window
  maintenance_window {
    day  = "sunday"
    hour = "02:00"
  }
  
  tags = [
    "environment:${var.environment}",
    "service:postgresql",
    "project:${var.project_name}",
    "terraform:managed"
  ]
}

# Container Registry Repository
resource "digitalocean_container_registry" "main" {
  name                   = var.project_name
  subscription_tier_slug = "basic"
  region                 = var.region
}

# App Platform Application
resource "digitalocean_app" "main" {
  spec {
    name   = "${var.project_name}-${var.environment}"
    region = var.region
    
    # Application service
    service {
      name               = "web"
      instance_count     = 1
      instance_size_slug = var.app_instance_size
      
      image {
        registry_type = "DOCR"
        registry      = digitalocean_container_registry.main.name
        repository    = var.project_name
        tag           = "redis-prod"
      }
      
      # Health check
      health_check {
        http_path             = "/api/health"
        initial_delay_seconds = 30
        period_seconds        = 10
        timeout_seconds       = 5
        success_threshold     = 1
        failure_threshold     = 3
      }
      
      # Environment variables
      env {
        key   = "NODE_ENV"
        value = "production"
      }
      
      env {
        key   = "PORT"
        value = "5001"
      }
      
      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.private_uri
        type  = "SECRET"
      }
      
      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.redis.private_uri
        type  = "SECRET"
      }
      
      env {
        key   = "REDIS_SESSION_DB"
        value = "${digitalocean_database_cluster.redis.private_uri}/1"
        type  = "SECRET"
      }
      
      env {
        key   = "REDIS_CACHE_DB"
        value = "${digitalocean_database_cluster.redis.private_uri}/2"
        type  = "SECRET"
      }
      
      env {
        key   = "SESSION_STORE"
        value = "redis"
      }
      
      env {
        key   = "CACHE_ENABLED"
        value = "true"
      }
      
      env {
        key   = "REDIS_SENTINEL_ENABLED"
        value = "false"
      }
    }
    
    # Database connections
    database {
      name     = "postgres"
      engine   = "PG"
      version  = "16"
      production = true
      cluster_name = digitalocean_database_cluster.postgres.name
    }
    
    database {
      name     = "redis"
      engine   = "REDIS"
      version  = "7"
      production = true
      cluster_name = digitalocean_database_cluster.redis.name
    }
    
    # Domain configuration
    domain {
      name = "evofitmeals.com"
      type = "PRIMARY"
    }
    
    # Alert configuration
    alert {
      rule = "CPU_UTILIZATION"
      disabled = false
      operator = "GREATER_THAN"
      value = 80.0
      window = "FIVE_MINUTES"
    }
    
    alert {
      rule = "MEM_UTILIZATION"
      disabled = false
      operator = "GREATER_THAN"
      value = 80.0
      window = "FIVE_MINUTES"
    }
  }
}

# VPC for enhanced security (optional)
resource "digitalocean_vpc" "main" {
  name     = "${var.project_name}-vpc-${var.environment}"
  region   = var.region
  ip_range = "10.10.0.0/16"
  
  tags = [
    "environment:${var.environment}",
    "project:${var.project_name}",
    "terraform:managed"
  ]
}

# Firewall for additional security
resource "digitalocean_firewall" "redis_access" {
  name = "${var.project_name}-redis-firewall"
  
  # Allow Redis access only from application
  inbound_rule {
    protocol   = "tcp"
    port_range = "6379"
    source_tags = ["app:${var.project_name}"]
  }
  
  # Allow Redis Sentinel access
  inbound_rule {
    protocol   = "tcp"
    port_range = "26379"
    source_tags = ["app:${var.project_name}"]
  }
  
  # Allow monitoring access
  inbound_rule {
    protocol   = "tcp"
    port_range = "9121"  # Redis exporter
    source_tags = ["monitoring"]
  }
  
  # Standard outbound rules
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  tags = [
    "environment:${var.environment}",
    "service:redis",
    "project:${var.project_name}",
    "terraform:managed"
  ]
}

# Monitoring Integration
resource "digitalocean_monitor_alert" "redis_high_cpu" {
  alerts {
    email = ["admin@evofitmeals.com"]
  }
  
  window      = "5m"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 80
  enabled     = true
  entities    = [digitalocean_database_cluster.redis.id]
  description = "High CPU usage on Redis cluster"
}

resource "digitalocean_monitor_alert" "redis_high_memory" {
  alerts {
    email = ["admin@evofitmeals.com"]
  }
  
  window      = "5m"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  entities    = [digitalocean_database_cluster.redis.id]
  description = "High memory usage on Redis cluster"
}

# Outputs
output "redis_connection_string" {
  description = "Redis private connection string"
  value       = digitalocean_database_cluster.redis.private_uri
  sensitive   = true
}

output "redis_host" {
  description = "Redis private host"
  value       = digitalocean_database_cluster.redis.private_host
}

output "redis_port" {
  description = "Redis port"
  value       = digitalocean_database_cluster.redis.port
}

output "redis_password" {
  description = "Redis password"
  value       = digitalocean_database_cluster.redis.password
  sensitive   = true
}

output "postgres_connection_string" {
  description = "PostgreSQL private connection string"
  value       = digitalocean_database_cluster.postgres.private_uri
  sensitive   = true
}

output "app_live_url" {
  description = "Application live URL"
  value       = digitalocean_app.main.live_url
}

output "app_id" {
  description = "DigitalOcean App ID"
  value       = digitalocean_app.main.id
}

output "container_registry_name" {
  description = "Container registry name"
  value       = digitalocean_container_registry.main.name
}

output "vpc_id" {
  description = "VPC ID"
  value       = digitalocean_vpc.main.id
}

# Local values for consistency
locals {
  common_tags = [
    "environment:${var.environment}",
    "project:${var.project_name}",
    "terraform:managed",
    "redis:enabled"
  ]
}