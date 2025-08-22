#!/bin/bash
# Redis Cache Warmer Script for FitnessMealPlanner Production
# Comprehensive cache warming implementation

set -euo pipefail

# Configuration
REDIS_HOST="${REDIS_HOST:-redis-primary}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
DATABASE_URL="${DATABASE_URL}"
LOG_FILE="/var/log/redis/cache-warming-$(date +%Y%m%d_%H%M%S).log"
STATS_FILE="/tmp/cache-warming-stats-$(date +%Y%m%d_%H%M%S).json"
BATCH_SIZE="${BATCH_SIZE:-50}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Counters for statistics
RECIPES_CACHED=0
MEALPLANS_CACHED=0
PREFERENCES_CACHED=0
SEARCHES_CACHED=0
NUTRITION_CACHED=0
SESSIONS_CACHED=0
TOTAL_ERRORS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌${NC} $1" | tee -a "$LOG_FILE"
    ((TOTAL_ERRORS++))
}

# Initialize logging
initialize_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "Redis Cache Warming Started"
    log "============================"
    log "Target: $REDIS_HOST:$REDIS_PORT"
    log "Database: ${DATABASE_URL%%@*}@***"
    log "Batch Size: $BATCH_SIZE"
    log "Max Retries: $MAX_RETRIES"
    log ""
}

# Test connections
test_connections() {
    log "Testing connections..."
    
    # Test Redis connection
    if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
        error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        return 1
    fi
    
    # Test database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to database"
        return 1
    fi
    
    success "All connections successful"
    return 0
}

# Check required tools
check_dependencies() {
    log "Checking required dependencies..."
    
    local missing_tools=()
    local required_tools=("redis-cli" "psql" "jq" "bc")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        log "Please install missing tools before running cache warming"
        return 1
    fi
    
    success "All dependencies available"
    return 0
}

# Execute Redis command with retry logic
redis_exec() {
    local cmd="$1"
    local retry_count=0
    
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" "$cmd" > /dev/null 2>&1; then
            return 0
        fi
        
        ((retry_count++))
        warn "Redis command failed, retry $retry_count/$MAX_RETRIES"
        sleep 1
    done
    
    error "Redis command failed after $MAX_RETRIES retries: $cmd"
    return 1
}

# Cache popular recipes
cache_popular_recipes() {
    log "Caching popular recipes..."
    local start_time=$(date +%s)
    
    # Get popular recipes in batches
    local offset=0
    local batch_count=0
    
    while true; do
        local recipes
        recipes=$(psql "$DATABASE_URL" -t -A -F'|' -c "
            SELECT r.id, r.name, r.ingredients, r.instructions, 
                   r.calories, r.prep_time, r.cook_time, r.rating, 
                   r.view_count, r.category, r.difficulty_level
            FROM recipes r
            WHERE r.is_active = true
            ORDER BY r.view_count DESC, r.rating DESC
            LIMIT $BATCH_SIZE OFFSET $offset;
        " 2>/dev/null)
        
        if [[ -z "$recipes" ]]; then
            break
        fi
        
        # Process batch
        echo "$recipes" | while IFS='|' read -r id name ingredients instructions calories prep_time cook_time rating view_count category difficulty; do
            if [[ -n "$id" && "$id" != "" ]]; then
                local recipe_json
                recipe_json=$(jq -n \
                    --arg id "$id" \
                    --arg name "$name" \
                    --arg ingredients "$ingredients" \
                    --arg instructions "$instructions" \
                    --arg calories "$calories" \
                    --arg prep_time "$prep_time" \
                    --arg cook_time "$cook_time" \
                    --arg rating "$rating" \
                    --arg view_count "$view_count" \
                    --arg category "$category" \
                    --arg difficulty "$difficulty" \
                    --arg cached_at "$(date -Iseconds)" \
                    '{
                        id: $id,
                        name: $name,
                        ingredients: ($ingredients | split(",")),
                        instructions: $instructions,
                        calories: ($calories | tonumber? // 0),
                        prepTime: ($prep_time | tonumber? // 0),
                        cookTime: ($cook_time | tonumber? // 0),
                        rating: ($rating | tonumber? // 0),
                        viewCount: ($view_count | tonumber? // 0),
                        category: $category,
                        difficulty: $difficulty,
                        cachedAt: $cached_at,
                        cacheSource: "warming"
                    }'
                )
                
                # Calculate TTL based on popularity
                local ttl
                local popularity=$((${view_count:-0} / 10))
                ttl=$((3600 + popularity * 60))  # 1 hour + popularity bonus
                ttl=$((ttl > 86400 ? 86400 : ttl))  # Max 24 hours
                
                if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
                    setex "recipe:$id" "$ttl" "$recipe_json" > /dev/null 2>&1; then
                    ((RECIPES_CACHED++))
                else
                    error "Failed to cache recipe $id"
                fi
            fi
        done
        
        ((batch_count++))
        offset=$((batch_count * BATCH_SIZE))
        
        # Progress indicator
        if [[ $((batch_count % 10)) -eq 0 ]]; then
            log "Processed $((batch_count * BATCH_SIZE)) recipes..."
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    success "Cached $RECIPES_CACHED recipes in ${duration}s"
}

# Cache user meal plans
cache_user_meal_plans() {
    log "Caching user meal plans..."
    local start_time=$(date +%s)
    
    # Get recent active meal plans
    psql "$DATABASE_URL" -t -A -F'|' -c "
        SELECT mp.user_id, mp.id, mp.name, mp.meals, mp.created_at,
               mp.target_calories, mp.dietary_restrictions
        FROM meal_plans mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.created_at >= NOW() - INTERVAL '7 days'
        AND u.last_login >= NOW() - INTERVAL '3 days'
        AND mp.is_active = true
        ORDER BY mp.created_at DESC
        LIMIT 1000;
    " 2>/dev/null | while IFS='|' read -r user_id plan_id name meals created_at target_calories dietary_restrictions; do
        
        if [[ -n "$user_id" && "$user_id" != "" ]]; then
            local plan_json
            plan_json=$(jq -n \
                --arg user_id "$user_id" \
                --arg plan_id "$plan_id" \
                --arg name "$name" \
                --arg meals "$meals" \
                --arg created_at "$created_at" \
                --arg target_calories "$target_calories" \
                --arg dietary_restrictions "$dietary_restrictions" \
                --arg cached_at "$(date -Iseconds)" \
                '{
                    userId: $user_id,
                    id: $plan_id,
                    name: $name,
                    meals: ($meals | fromjson? // []),
                    createdAt: $created_at,
                    targetCalories: ($target_calories | tonumber? // 0),
                    dietaryRestrictions: ($dietary_restrictions | split(",") // []),
                    cachedAt: $cached_at,
                    cacheSource: "warming"
                }'
            )
            
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
                setex "mealplan:$user_id:$plan_id" 86400 "$plan_json" > /dev/null 2>&1; then
                ((MEALPLANS_CACHED++))
            else
                error "Failed to cache meal plan $plan_id for user $user_id"
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    success "Cached $MEALPLANS_CACHED meal plans in ${duration}s"
}

# Cache user preferences and sessions
cache_user_preferences() {
    log "Caching user preferences..."
    local start_time=$(date +%s)
    
    psql "$DATABASE_URL" -t -A -F'|' -c "
        SELECT u.id, u.email, u.dietary_preferences, u.allergies, 
               u.fitness_goals, u.last_login, u.activity_level,
               u.target_weight, u.current_weight
        FROM users u
        WHERE u.last_login >= NOW() - INTERVAL '7 days'
        AND u.is_active = true
        ORDER BY u.last_login DESC
        LIMIT 2000;
    " 2>/dev/null | while IFS='|' read -r user_id email dietary_preferences allergies fitness_goals last_login activity_level target_weight current_weight; do
        
        if [[ -n "$user_id" && "$user_id" != "" ]]; then
            local preferences_json
            preferences_json=$(jq -n \
                --arg user_id "$user_id" \
                --arg email "$email" \
                --arg dietary_preferences "$dietary_preferences" \
                --arg allergies "$allergies" \
                --arg fitness_goals "$fitness_goals" \
                --arg last_login "$last_login" \
                --arg activity_level "$activity_level" \
                --arg target_weight "$target_weight" \
                --arg current_weight "$current_weight" \
                --arg cached_at "$(date -Iseconds)" \
                '{
                    userId: $user_id,
                    email: $email,
                    dietaryPreferences: ($dietary_preferences | split(",") // []),
                    allergies: ($allergies | split(",") // []),
                    fitnessGoals: ($fitness_goals | split(",") // []),
                    lastLogin: $last_login,
                    activityLevel: $activity_level,
                    targetWeight: ($target_weight | tonumber? // null),
                    currentWeight: ($current_weight | tonumber? // null),
                    cachedAt: $cached_at,
                    cacheSource: "warming"
                }'
            )
            
            # Cache preferences with 7-day TTL
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
                setex "preferences:$user_id" 604800 "$preferences_json" > /dev/null 2>&1; then
                ((PREFERENCES_CACHED++))
            else
                error "Failed to cache preferences for user $user_id"
            fi
            
            # Cache session data with 24-hour TTL
            local session_json
            session_json=$(jq -n \
                --arg user_id "$user_id" \
                --arg last_activity "$(date -Iseconds)" \
                --arg session_start "$(date -Iseconds)" \
                '{
                    userId: $user_id,
                    lastActivity: $last_activity,
                    sessionStart: $session_start,
                    isActive: true,
                    cacheSource: "warming"
                }'
            )
            
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
                setex "session:$user_id" 86400 "$session_json" > /dev/null 2>&1; then
                ((SESSIONS_CACHED++))
            else
                error "Failed to cache session for user $user_id"
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    success "Cached $PREFERENCES_CACHED preferences and $SESSIONS_CACHED sessions in ${duration}s"
}

# Cache frequent search results
cache_search_results() {
    log "Caching frequent search results..."
    local start_time=$(date +%s)
    
    # Get popular search terms from logs or predefined list
    local search_terms=(
        "chicken breast" "vegetarian" "low carb" "high protein" "gluten free"
        "quick meals" "breakfast" "dinner" "lunch" "weight loss"
        "muscle gain" "keto" "mediterranean" "salad" "soup"
        "pasta" "beef" "fish" "vegan" "dairy free"
        "low calorie" "high fiber" "diabetic friendly" "heart healthy" "paleo"
    )
    
    for term in "${search_terms[@]}"; do
        local search_hash
        search_hash=$(echo -n "$term" | md5sum | cut -d' ' -f1)
        
        local search_results
        search_results=$(psql "$DATABASE_URL" -t -c "
            SELECT json_agg(
                json_build_object(
                    'id', r.id,
                    'name', r.name,
                    'calories', r.calories,
                    'rating', r.rating,
                    'prepTime', r.prep_time,
                    'category', r.category
                )
            )
            FROM recipes r
            WHERE (r.name ILIKE '%$term%' OR r.ingredients ILIKE '%$term%')
            AND r.is_active = true
            ORDER BY r.rating DESC, r.view_count DESC
            LIMIT 20;
        " 2>/dev/null)
        
        if [[ -n "$search_results" && "$search_results" != "null" && "$search_results" != "" ]]; then
            local cache_data
            cache_data=$(jq -n \
                --arg term "$term" \
                --arg hash "$search_hash" \
                --argjson results "$search_results" \
                --arg cached_at "$(date -Iseconds)" \
                '{
                    searchTerm: $term,
                    searchHash: $hash,
                    results: $results,
                    resultCount: ($results | length),
                    cachedAt: $cached_at,
                    cacheSource: "warming"
                }'
            )
            
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
                setex "search:$search_hash" 1800 "$cache_data" > /dev/null 2>&1; then
                ((SEARCHES_CACHED++))
            else
                error "Failed to cache search results for: $term"
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    success "Cached $SEARCHES_CACHED search results in ${duration}s"
}

# Cache nutrition data
cache_nutrition_data() {
    log "Caching nutrition data..."
    local start_time=$(date +%s)
    
    psql "$DATABASE_URL" -t -A -F'|' -c "
        SELECT ingredient_name, calories_per_100g, protein, carbs, fat, fiber,
               vitamin_c, calcium, iron, sodium, sugar
        FROM nutrition_data
        ORDER BY usage_frequency DESC
        LIMIT 500;
    " 2>/dev/null | while IFS='|' read -r ingredient calories protein carbs fat fiber vitamin_c calcium iron sodium sugar; do
        
        if [[ -n "$ingredient" && "$ingredient" != "" ]]; then
            local nutrition_json
            nutrition_json=$(jq -n \
                --arg ingredient "$ingredient" \
                --arg calories "$calories" \
                --arg protein "$protein" \
                --arg carbs "$carbs" \
                --arg fat "$fat" \
                --arg fiber "$fiber" \
                --arg vitamin_c "$vitamin_c" \
                --arg calcium "$calcium" \
                --arg iron "$iron" \
                --arg sodium "$sodium" \
                --arg sugar "$sugar" \
                --arg cached_at "$(date -Iseconds)" \
                '{
                    ingredient: $ingredient,
                    caloriesPer100g: ($calories | tonumber? // 0),
                    protein: ($protein | tonumber? // 0),
                    carbs: ($carbs | tonumber? // 0),
                    fat: ($fat | tonumber? // 0),
                    fiber: ($fiber | tonumber? // 0),
                    vitaminC: ($vitamin_c | tonumber? // 0),
                    calcium: ($calcium | tonumber? // 0),
                    iron: ($iron | tonumber? // 0),
                    sodium: ($sodium | tonumber? // 0),
                    sugar: ($sugar | tonumber? // 0),
                    cachedAt: $cached_at,
                    cacheSource: "warming"
                }'
            )
            
            local ingredient_key
            ingredient_key=$(echo "$ingredient" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
            
            if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
                setex "nutrition:$ingredient_key" 86400 "$nutrition_json" > /dev/null 2>&1; then
                ((NUTRITION_CACHED++))
            else
                error "Failed to cache nutrition data for: $ingredient"
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    success "Cached $NUTRITION_CACHED nutrition entries in ${duration}s"
}

# Generate comprehensive statistics
generate_statistics() {
    log "Generating cache warming statistics..."
    
    local redis_info
    redis_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO memory 2>/dev/null || echo "")
    
    local total_keys
    total_keys=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE 2>/dev/null || echo "0")
    
    # Get memory usage
    local used_memory
    local used_memory_human
    used_memory=$(echo "$redis_info" | grep "used_memory:" | cut -d: -f2 | tr -d '\r' || echo "0")
    used_memory_human=$(echo "$redis_info" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r' || echo "0B")
    
    # Get fragmentation ratio
    local fragmentation_ratio
    fragmentation_ratio=$(echo "$redis_info" | grep "mem_fragmentation_ratio:" | cut -d: -f2 | tr -d '\r' || echo "1.0")
    
    # Create comprehensive statistics
    cat > "$STATS_FILE" << EOF
{
    "cacheWarmingReport": {
        "timestamp": "$(date -Iseconds)",
        "duration": "$(($(date +%s) - START_TIME))",
        "targetHost": "$REDIS_HOST:$REDIS_PORT",
        "summary": {
            "totalKeysWarmed": $((RECIPES_CACHED + MEALPLANS_CACHED + PREFERENCES_CACHED + SEARCHES_CACHED + NUTRITION_CACHED + SESSIONS_CACHED)),
            "totalKeysInRedis": $total_keys,
            "totalErrors": $TOTAL_ERRORS,
            "successRate": "$(echo "scale=2; (($total_keys - $TOTAL_ERRORS) * 100) / $total_keys" | bc 2>/dev/null || echo "100.00")%"
        },
        "keysByType": {
            "recipes": $RECIPES_CACHED,
            "mealplans": $MEALPLANS_CACHED,
            "preferences": $PREFERENCES_CACHED,
            "sessions": $SESSIONS_CACHED,
            "searches": $SEARCHES_CACHED,
            "nutrition": $NUTRITION_CACHED
        },
        "memoryUsage": {
            "used": "$used_memory_human",
            "usedBytes": $used_memory,
            "fragmentationRatio": $fragmentation_ratio
        },
        "configuration": {
            "batchSize": $BATCH_SIZE,
            "maxRetries": $MAX_RETRIES,
            "logFile": "$LOG_FILE",
            "statsFile": "$STATS_FILE"
        }
    }
}
EOF
    
    success "Statistics saved to: $STATS_FILE"
    
    # Display summary
    log ""
    log "Cache Warming Summary"
    log "===================="
    log "Recipes cached: $RECIPES_CACHED"
    log "Meal plans cached: $MEALPLANS_CACHED"
    log "User preferences cached: $PREFERENCES_CACHED"
    log "User sessions cached: $SESSIONS_CACHED"
    log "Search results cached: $SEARCHES_CACHED"
    log "Nutrition entries cached: $NUTRITION_CACHED"
    log "Total keys: $total_keys"
    log "Memory usage: $used_memory_human"
    log "Errors encountered: $TOTAL_ERRORS"
    log ""
    
    if [[ $TOTAL_ERRORS -gt 0 ]]; then
        warn "Cache warming completed with $TOTAL_ERRORS errors"
        warn "Check log file for details: $LOG_FILE"
    else
        success "Cache warming completed successfully!"
    fi
}

# Validate cache warming results
validate_cache_warming() {
    log "Validating cache warming results..."
    
    local validation_failed=false
    
    # Check minimum key counts
    local min_recipes=50
    local min_total=200
    
    if [[ $RECIPES_CACHED -lt $min_recipes ]]; then
        error "Insufficient recipes cached: $RECIPES_CACHED < $min_recipes"
        validation_failed=true
    fi
    
    if [[ $((RECIPES_CACHED + MEALPLANS_CACHED + PREFERENCES_CACHED + SEARCHES_CACHED + NUTRITION_CACHED + SESSIONS_CACHED)) -lt $min_total ]]; then
        error "Insufficient total keys cached: < $min_total"
        validation_failed=true
    fi
    
    # Test cache retrieval
    local test_recipe_key
    test_recipe_key=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
        eval "return redis.call('randomkey')" 0 2>/dev/null | grep "recipe:" | head -1)
    
    if [[ -n "$test_recipe_key" ]]; then
        local test_data
        test_data=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
            get "$test_recipe_key" 2>/dev/null)
        
        if [[ -n "$test_data" ]] && echo "$test_data" | jq . > /dev/null 2>&1; then
            success "Cache data validation passed"
        else
            error "Cache data appears corrupted"
            validation_failed=true
        fi
    fi
    
    if [[ "$validation_failed" == "true" ]]; then
        error "Cache warming validation failed"
        return 1
    else
        success "Cache warming validation passed"
        return 0
    fi
}

# Main execution
main() {
    START_TIME=$(date +%s)
    
    initialize_logging
    
    # Prerequisite checks
    if ! check_dependencies; then
        exit 1
    fi
    
    if ! test_connections; then
        exit 1
    fi
    
    log "Starting cache warming process..."
    
    # Execute cache warming in optimal order
    cache_popular_recipes
    cache_user_preferences  # This also caches sessions
    cache_user_meal_plans
    cache_search_results
    cache_nutrition_data
    
    # Generate final statistics and validation
    generate_statistics
    
    if validate_cache_warming; then
        local end_time=$(date +%s)
        local total_duration=$((end_time - START_TIME))
        success "Cache warming completed successfully in ${total_duration}s"
        exit 0
    else
        error "Cache warming validation failed"
        exit 1
    fi
}

# Handle script interruption
cleanup() {
    warn "Cache warming interrupted - generating partial statistics..."
    generate_statistics
    exit 1
}

trap cleanup INT TERM

# Run main function if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi