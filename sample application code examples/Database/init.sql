
-- Create database
CREATE DATABASE IF NOT EXISTS tfi_heroes;
USE tfi_heroes;

-- Create heroes table
CREATE TABLE IF NOT EXISTS heroes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    industry VARCHAR(50) DEFAULT 'Tollywood',
    debut_year INT NOT NULL,
    experience_years INT NOT NULL,
    salary_per_movie BIGINT NOT NULL, -- in Indian Rupees
    hit_movies INT DEFAULT 0,
    flop_movies INT DEFAULT 0,
    awards_won INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert TFI Heroes data
INSERT INTO heroes (name, debut_year, experience_years, salary_per_movie, hit_movies, flop_movies, awards_won) VALUES
('Chiranjeevi', 1978, 47, 150000000, 150, 40, 12),
('Nagarjuna', 1986, 39, 100000000, 100, 45, 8),
('Balakrishna', 1974, 51, 120000000, 120, 50, 9),
('Venkatesh', 1986, 39, 80000000, 95, 40, 7),
('Pawan Kalyan', 1996, 29, 200000000, 60, 20, 6),
('Mahesh Babu', 1999, 26, 250000000, 55, 15, 10),
('Prabhas', 2002, 23, 300000000, 30, 12, 5),
('Allu Arjun', 2003, 22, 200000000, 45, 12, 8),
('Ram Charan', 2007, 18, 180000000, 30, 8, 5),
('NTR Jr', 2001, 24, 200000000, 40, 10, 7),
('Ravi Teja', 1997, 28, 80000000, 65, 30, 4),
('Nithiin', 2002, 23, 40000000, 30, 20, 2),
('Nani', 2008, 17, 50000000, 35, 10, 3),
('Vijay Deverakonda', 2011, 14, 70000000, 20, 10, 2),
('Adivi Sesh', 2010, 15, 40000000, 15, 5, 2),
('Sundeep Kishan', 2008, 17, 30000000, 15, 15, 1),
('Naga Chaitanya', 2009, 16, 50000000, 20, 15, 2),
('Akhil Akkineni', 2014, 11, 40000000, 5, 5, 0),
('Sai Dharam Tej', 2014, 11, 35000000, 10, 8, 1),
('Varun Tej', 2014, 11, 40000000, 12, 8, 2),
('Ram Pothineni', 2006, 19, 35000000, 18, 12, 1),
('Sharwanand', 2004, 21, 30000000, 18, 12, 1),
('Naveen Polishetty', 2019, 6, 25000000, 5, 2, 1),
('Siddhu Jonnalagadda', 2018, 7, 20000000, 5, 3, 0),
('Teja Sajja', 2019, 6, 20000000, 4, 2, 0);

-- Query: Display all heroes sorted by salary
SELECT name, experience_years, salary_per_movie
FROM heroes
ORDER BY salary_per_movie DESC;

-- Query: Top 5 highest paid heroes
SELECT name, salary_per_movie, hit_movies
FROM heroes
ORDER BY salary_per_movie DESC
LIMIT 5;

-- Query: Average salary by experience
SELECT
    CASE
        WHEN experience_years >= 40 THEN '40+ years'
        WHEN experience_years >= 25 THEN '25-39 years'
        WHEN experience_years >= 15 THEN '15-24 years'
        ELSE 'Below 15 years'
    END AS experience_bracket,
    COUNT(*) AS hero_count,
    AVG(salary_per_movie) AS avg_salary
FROM heroes
GROUP BY experience_bracket;

-- Query: Heroes with best hit ratio (min 10 movies)
SELECT name, hit_movies, flop_movies,
    ROUND((hit_movies / (hit_movies + flop_movies)) * 100, 2) AS success_rate
FROM heroes
WHERE (hit_movies + flop_movies) >= 10
ORDER BY success_rate DESC;

-- Query: Most experienced active heroes
SELECT name, debut_year, experience_years, salary_per_movie
FROM heroes
WHERE is_active = TRUE
ORDER BY experience_years DESC;
