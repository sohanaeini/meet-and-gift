-- Test updating the asfa invite to booked status
UPDATE invites 
SET status = 'booked' 
WHERE title = 'asfa';

-- Check if the update worked
SELECT title, status, id FROM invites WHERE title = 'asfa';